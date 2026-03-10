"use client";

import { useState } from "react";
import type { Quest, Task } from "@/lib/types";
import { DIFFICULTY_COLORS, TIME_ESTIMATES } from "@/lib/xp";
import { completeTask, deleteTask, deleteQuest } from "./actions";
import { PlanSummaryTooltip } from "./PlanSummaryTooltip";

function TaskRow({ task }: { task: Task }) {
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleComplete() {
    setCompleting(true);
    try {
      const result = await completeTask(task.id);
      if (result.questCompleted) {
        setToast("Quest completed!");
      } else if (result.leveledUp) {
        setToast(`Level Up! Level ${result.newLevel}!`);
      }
      if (toast) setTimeout(() => setToast(null), 3000);
    } finally {
      setCompleting(false);
    }
  }

  const isCompleted = task.status === "completed";

  return (
    <div className={`flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 ${isCompleted ? "opacity-60" : ""}`}>
      {toast && (
        <div
          className="absolute -top-8 left-0 right-0 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 text-center text-xs font-bold text-yellow-300"
          style={{ animation: "level-up 0.5s ease-out" }}
        >
          &#x2B50; {toast}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold text-white ${isCompleted ? "line-through" : ""}`}>
            {task.title}
          </span>
          <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${DIFFICULTY_COLORS[task.difficulty]}`}>
            {task.difficulty}
          </span>
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-violet-400">{task.description}</p>
        )}
      </div>
      <span className="shrink-0 text-xs font-semibold text-violet-500">
        {TIME_ESTIMATES[task.difficulty]} · +{task.xp_reward} XP
      </span>
      {!isCompleted && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
        >
          {completing ? "..." : "Done"}
        </button>
      )}
      <button
        onClick={() => deleteTask(task.id)}
        className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-violet-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
      >
        &#x2715;
      </button>
    </div>
  );
}

function QuestSection({ quest, tasks }: { quest: Quest; tasks: Task[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "completed").length;
  const progress = total === 0 ? 0 : done / total;
  const isComplete = quest.status === "completed";

  return (
    <div
      className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden ${
        isComplete ? "opacity-70" : ""
      }`}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-5 py-4 text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{quest.name}</span>
              {quest.plan_summary && <PlanSummaryTooltip summary={quest.plan_summary} />}
              {isComplete && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                  Complete
                </span>
              )}
            </div>
            {quest.description && (
              <p className="mt-0.5 text-sm text-violet-400">{quest.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs font-semibold text-violet-400">
              {done}/{total} tasks
            </span>
            <span className="text-violet-500">{collapsed ? "▶" : "▼"}</span>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-gradient-to-r from-violet-500 to-indigo-500"
            }`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      </button>

      {!collapsed && tasks.length > 0 && (
        <div className="border-t border-[var(--card-border)] px-4 py-4 space-y-1.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-[var(--card-border)] px-4 py-2">
          <button
            onClick={() => deleteQuest(quest.id)}
            className="text-xs font-semibold text-violet-500 transition-colors hover:text-red-400"
          >
            Delete Quest
          </button>
        </div>
      )}
    </div>
  );
}

export function StandaloneQuestList({
  quests,
  tasks,
}: {
  quests: Quest[];
  tasks: Task[];
}) {
  if (quests.length === 0) return null;

  return (
    <div className="space-y-3">
      {quests.map((quest) => (
        <QuestSection
          key={quest.id}
          quest={quest}
          tasks={tasks.filter((t) => t.quest_id === quest.id)}
        />
      ))}
    </div>
  );
}
