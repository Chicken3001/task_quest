"use client";

import { useState } from "react";
import type { Epic, Quest } from "@/lib/types";
import { QuestList } from "./QuestList";

function EpicSection({ epic, quests }: { epic: Epic; quests: Quest[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const total = quests.length;
  const done = quests.filter((q) => q.status === "completed").length;
  const progress = total === 0 ? 0 : done / total;
  const isComplete = epic.status === "completed";

  const activeQuests = quests.filter((q) => q.status === "active");
  const completedQuests = quests.filter((q) => q.status === "completed");

  return (
    <div
      className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden ${
        isComplete ? "opacity-70" : ""
      }`}
    >
      {/* Epic header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-5 py-4 text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{epic.name}</span>
              {isComplete && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                  Complete
                </span>
              )}
            </div>
            {epic.description && (
              <p className="mt-0.5 text-sm text-violet-400">{epic.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs font-semibold text-violet-400">
              {done}/{total}
            </span>
            <span className="text-violet-500">{collapsed ? "▶" : "▼"}</span>
          </div>
        </div>

        {/* Progress bar */}
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

      {/* Quest list */}
      {!collapsed && total > 0 && (
        <div className="border-t border-[var(--card-border)] px-4 py-4 space-y-4">
          {activeQuests.length > 0 && <QuestList quests={activeQuests} type="active" />}
          {completedQuests.length > 0 && <QuestList quests={completedQuests} type="completed" />}
        </div>
      )}
    </div>
  );
}

export function EpicList({ epics, quests }: { epics: Epic[]; quests: Quest[] }) {
  if (epics.length === 0) return null;

  return (
    <div className="space-y-3">
      {epics.map((epic) => (
        <EpicSection
          key={epic.id}
          epic={epic}
          quests={quests.filter((q) => q.epic_id === epic.id)}
        />
      ))}
    </div>
  );
}
