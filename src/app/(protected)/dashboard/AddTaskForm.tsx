"use client";

import { useState, useRef } from "react";
import { addTask } from "./actions";
import { DIFFICULTY_COLORS, type Difficulty } from "@/lib/xp";
import type { Epic, Quest } from "@/lib/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];

const XP_LABELS: Record<Difficulty, string> = {
  easy: "+10 XP",
  medium: "+25 XP",
  hard: "+50 XP",
  epic: "+100 XP",
};

export function AddTaskForm({
  epics,
  quests,
}: {
  epics: Epic[];
  quests: Quest[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [selectedEpicId, setSelectedEpicId] = useState("");
  const [selectedQuestId, setSelectedQuestId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const activeEpics = epics.filter((e) => e.status === "active");
  const availableQuests = selectedEpicId
    ? quests.filter((q) => q.epic_id === selectedEpicId && q.status === "active")
    : [];

  async function handleSubmit(formData: FormData) {
    formData.set("difficulty", difficulty);
    if (selectedQuestId) {
      formData.set("quest_id", selectedQuestId);
    }
    await addTask(formData);
    formRef.current?.reset();
    setDifficulty("easy");
    setSelectedEpicId("");
    setSelectedQuestId("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-4 text-center font-semibold text-violet-400 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300"
      >
        + New Task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
      style={{ animation: "slide-in 0.2s ease-out" }}
    >
      <h3 className="mb-4 text-lg font-bold text-white">New Task</h3>

      <div className="space-y-3">
        <input
          name="title"
          type="text"
          placeholder="Task title..."
          required
          className="w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />

        <textarea
          name="description"
          placeholder="Description (optional)"
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />

        {/* Quest assignment */}
        {activeEpics.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-violet-400">
              Assign to Quest <span className="font-normal text-violet-500">(optional)</span>
            </p>
            <select
              value={selectedEpicId}
              onChange={(e) => {
                setSelectedEpicId(e.target.value);
                setSelectedQuestId("");
              }}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              <option value="" className="bg-[var(--card-bg)]">Standalone task</option>
              {activeEpics.map((epic) => (
                <option key={epic.id} value={epic.id} className="bg-[var(--card-bg)]">
                  {epic.name}
                </option>
              ))}
            </select>

            {selectedEpicId && availableQuests.length > 0 && (
              <select
                value={selectedQuestId}
                onChange={(e) => setSelectedQuestId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="" className="bg-[var(--card-bg)]">Select a quest...</option>
                {availableQuests.map((quest) => (
                  <option key={quest.id} value={quest.id} className="bg-[var(--card-bg)]">
                    {quest.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-violet-400">
            Difficulty
          </p>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold capitalize transition-all ${
                  difficulty === d
                    ? DIFFICULTY_COLORS[d] + " ring-2 ring-white/20"
                    : "border-[var(--card-border)] text-violet-400 hover:bg-white/5"
                }`}
              >
                {d}
                <span className="block text-xs font-medium opacity-75">
                  {XP_LABELS[d]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110"
          >
            Add Task
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-violet-300 transition-colors hover:bg-white/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
