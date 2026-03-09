"use client";

import { useState } from "react";
import { completeQuest, deleteQuest } from "./actions";
import { DIFFICULTY_COLORS } from "@/lib/xp";
import type { Quest } from "@/lib/types";

function QuestCard({
  quest,
  type,
}: {
  quest: Quest;
  type: "active" | "completed";
}) {
  const [completing, setCompleting] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  async function handleComplete() {
    setCompleting(true);
    try {
      const result = await completeQuest(quest.id);
      if (result.leveledUp) {
        setLevelUp(result.newLevel);
        setTimeout(() => setLevelUp(null), 3000);
      }
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-all ${
        type === "completed" ? "opacity-60" : ""
      }`}
      style={{ animation: "slide-in 0.2s ease-out" }}
    >
      {levelUp && (
        <div
          className="mb-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-2 text-center text-sm font-bold text-yellow-300"
          style={{ animation: "level-up 0.5s ease-out" }}
        >
          &#x2B50; Level Up! You are now level {levelUp}!
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`font-bold text-white ${
                type === "completed" ? "line-through" : ""
              }`}
            >
              {quest.title}
            </h3>
            <span
              className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-bold capitalize ${DIFFICULTY_COLORS[quest.difficulty]}`}
            >
              {quest.difficulty}
            </span>
          </div>
          {quest.description && (
            <p className="mt-1 text-sm text-violet-400">{quest.description}</p>
          )}
          <p className="mt-1 text-xs text-violet-500">+{quest.xp_reward} XP</p>
        </div>
        <div className="flex gap-2">
          {type === "active" && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/40 disabled:opacity-50"
            >
              {completing ? "..." : "Complete"}
            </button>
          )}
          <button
            onClick={() => deleteQuest(quest.id)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            &#x2715;
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestList({
  quests,
  type,
}: {
  quests: Quest[];
  type: "active" | "completed";
}) {
  return (
    <div className="space-y-2">
      {quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} type={type} />
      ))}
    </div>
  );
}
