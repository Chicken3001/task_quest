"use client";

import { useState } from "react";
import { createEpicWithQuests } from "./actions";
import { DIFFICULTY_COLORS, XP_REWARDS, type Difficulty } from "@/lib/xp";

interface GeneratedQuest {
  title: string;
  description: string;
  difficulty: Difficulty;
}

interface GeneratedEpic {
  name: string;
  description: string;
  quests: GeneratedQuest[];
}

type Step = "input" | "preview";

export function GenerateQuestChain() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epics, setEpics] = useState<GeneratedEpic[]>([]);

  function handleClose() {
    setOpen(false);
    setStep("input");
    setDescription("");
    setEpics([]);
    setError(null);
  }

  async function handleGenerate() {
    if (description.trim().length < 10) {
      setError("Please enter a more detailed project description.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setEpics(data.epics);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      await createEpicWithQuests(
        epics.map((e) => ({
          epicName: e.name,
          epicDescription: e.description,
          quests: e.quests,
        }))
      );
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create quests");
      setCreating(false);
    }
  }

  const totalXp = epics.flatMap((e) => e.quests).reduce((sum, q) => sum + XP_REWARDS[q.difficulty], 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500"
      >
        <span>&#x2728;</span> Generate Quest Chain
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  {step === "input" ? "Generate Quest Chain" : "Preview Quest Chain"}
                </h2>
                <p className="text-sm text-violet-400">
                  {step === "input"
                    ? "Describe your project and AI will break it into epics and quests."
                    : `${epics.length} epics · ${epics.flatMap((e) => e.quests).length} quests · ${totalXp} XP`}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-400 hover:bg-red-500/20 hover:text-red-400"
              >
                &#x2715;
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {step === "input" && (
              <div className="space-y-4">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project in detail... e.g. 'Build a recipe sharing web app with user accounts, recipe CRUD, search, and ratings.'"
                  rows={6}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-violet-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                {epics.map((epic, ei) => (
                  <div
                    key={ei}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-white">{epic.name}</h3>
                      {epic.description && (
                        <p className="text-sm text-violet-400">{epic.description}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {epic.quests.map((q, qi) => (
                        <div
                          key={qi}
                          className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{q.title}</span>
                              <span
                                className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${DIFFICULTY_COLORS[q.difficulty]}`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                            {q.description && (
                              <p className="mt-0.5 text-xs text-violet-400">{q.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-violet-500">
                            +{XP_REWARDS[q.difficulty]} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("input")}
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-violet-300 transition-colors hover:bg-white/5"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create All Quests"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
