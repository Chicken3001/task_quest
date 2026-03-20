"use client";

import { useState, useRef, useEffect } from "react";
import { createEpicWithQuestsAndTasks, createQuestWithTasks } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { DIFFICULTY_COLORS, XP_REWARDS, TIME_ESTIMATES, type Difficulty } from "@/lib/xp";
import type { ChatMessage, GeneratedEpic, GeneratedQuest } from "@/lib/types";

type PlannerMode = "quest" | "epic";
type Step = "chat" | "generating" | "preview";

function PlannerModal({
  mode,
  onClose,
}: {
  mode: PlannerMode;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epic, setEpic] = useState<GeneratedEpic | null>(null);
  const [quest, setQuest] = useState<GeneratedQuest | null>(null);
  const [includePersonalInfo, setIncludePersonalInfo] = useState(false);
  const [hasPersonalInfo, setHasPersonalInfo] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const label = mode === "quest" ? "Quest" : "Epic";

  function scrollToBottom() {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    sendToChat([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function checkPersonalInfo() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("task_quest_profiles")
        .select("personal_info")
        .eq("id", user.id)
        .single();
      setHasPersonalInfo(!!data?.personal_info);
    }
    checkPersonalInfo();
  }, []);

  async function sendToChat(msgs: ChatMessage[]) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/quests/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          mode,
          includePersonalInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        suggestedResponses: data.suggestedResponses,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setReadyToGenerate(data.readyToGenerate);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMessage: ChatMessage = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    scrollToBottom();

    await sendToChat(newMessages);
  }

  async function handleGenerate() {
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/quests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          mode,
          includePersonalInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      if (mode === "quest") {
        setQuest(data.quest);
      } else {
        setEpic(data.epic);
      }
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("chat");
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      if (mode === "quest" && quest) {
        await createQuestWithTasks(quest);
      } else if (mode === "epic" && epic) {
        await createEpicWithQuestsAndTasks(epic);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setCreating(false);
    }
  }

  // Stats for preview
  const previewTasks = mode === "quest"
    ? quest?.tasks ?? []
    : epic?.quests.flatMap((q) => q.tasks) ?? [];
  const totalQuests = epic?.quests.length ?? 0;
  const totalTasks = previewTasks.length;
  const totalXp = previewTasks.reduce((sum, t) => sum + XP_REWARDS[t.difficulty], 0);

  const subtitle = mode === "quest"
    ? `${totalTasks} tasks \u00B7 ${totalXp} XP`
    : `${totalQuests} quests \u00B7 ${totalTasks} tasks \u00B7 ${totalXp} XP`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full flex-col h-[100dvh] sm:h-auto sm:max-w-2xl sm:max-h-[85vh] sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                {step === "chat" && `${label} Planner`}
                {step === "generating" && "Generating Plan..."}
                {step === "preview" && `Preview ${label}`}
              </h2>
              <p className="text-sm text-violet-400">
                {step === "chat" && (mode === "quest"
                  ? "Chat with AI to plan a focused quest"
                  : "Chat with AI to plan a full project")}
                {step === "generating" && `Building your ${label.toLowerCase()} plan...`}
                {step === "preview" && subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-400 hover:bg-red-500/20 hover:text-red-400"
            >
              &#x2715;
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Chat step */}
        {step === "chat" && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-violet-600/30 text-white"
                          : "bg-white/5 text-violet-100"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {msg.suggestedResponses && msg.suggestedResponses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-1">
                      {msg.suggestedResponses.map((sr, j) => (
                        <button
                          key={j}
                          onClick={() => handleSend(sr)}
                          disabled={sending}
                          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/20 disabled:opacity-50"
                        >
                          {sr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 px-4 py-3">
                    <span className="typing-dot" />
                    <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-personal-info"
                  checked={includePersonalInfo}
                  disabled={!hasPersonalInfo}
                  onChange={(e) => setIncludePersonalInfo(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-violet-600 accent-violet-600 disabled:opacity-40"
                />
                <label
                  htmlFor="include-personal-info"
                  className={`text-sm font-medium ${hasPersonalInfo ? "text-violet-300" : "text-violet-400/50"}`}
                >
                  Include my personal info
                </label>
                <div
                  className="relative"
                  onMouseEnter={() => setShowInfoTooltip(true)}
                  onMouseLeave={() => setShowInfoTooltip(false)}
                >
                  <span className={`cursor-help text-xs font-bold ${hasPersonalInfo ? "text-violet-400" : "text-violet-400/40"}`}>?</span>
                  {showInfoTooltip && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-violet-300 shadow-xl">
                      {hasPersonalInfo
                        ? "Sends your personal info (skills, preferences, goals) as context for better AI planning. Edit in Account Settings."
                        : "Add personal info in Account Settings to enable this."}
                    </div>
                  )}
                </div>
              </div>
              {readyToGenerate && (
                <button
                  onClick={handleGenerate}
                  className="mb-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-500 hover:to-teal-500"
                >
                  Generate Plan
                </button>
              )}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your response..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 text-base sm:text-sm text-white placeholder-violet-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={sending || !input.trim()}
                  className="shrink-0 rounded-xl bg-violet-600 px-3 py-2.5 sm:px-4 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        {/* Generating step */}
        {step === "generating" && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
              </div>
              <p className="text-sm text-violet-400">Building your {label.toLowerCase()} plan...</p>
            </div>
          </div>
        )}

        {/* Preview step — Quest mode */}
        {step === "preview" && mode === "quest" && quest && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 sm:p-4">
                <h3 className="text-lg font-black text-white">{quest.name}</h3>
                {quest.description && (
                  <p className="mt-1 text-sm text-violet-300">{quest.description}</p>
                )}
              </div>
              <div className="space-y-2">
                {quest.tasks.map((task, ti) => (
                  <div
                    key={ti}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{task.title}</span>
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${DIFFICULTY_COLORS[task.difficulty]}`}
                        >
                          {task.difficulty}
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-violet-400">{task.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-violet-500">
                      {TIME_ESTIMATES[task.difficulty]} · +{XP_REWARDS[task.difficulty]} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("generating"); handleGenerate(); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-violet-300 transition-colors hover:bg-white/5"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create All"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Preview step — Epic mode */}
        {step === "preview" && mode === "epic" && epic && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <h3 className="text-lg font-black text-white">{epic.name}</h3>
                {epic.description && (
                  <p className="mt-1 text-sm text-violet-300">{epic.description}</p>
                )}
              </div>

              {epic.quests.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3">
                    <h4 className="font-bold text-white">{q.name}</h4>
                    {q.description && (
                      <p className="text-sm text-violet-400">{q.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {q.tasks.map((task, ti) => (
                      <div
                        key={ti}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{task.title}</span>
                            <span
                              className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-bold capitalize ${DIFFICULTY_COLORS[task.difficulty]}`}
                            >
                              {task.difficulty}
                            </span>
                          </div>
                          {task.description && (
                            <p className="mt-0.5 text-xs text-violet-400">{task.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-violet-500">
                          {TIME_ESTIMATES[task.difficulty]} · +{XP_REWARDS[task.difficulty]} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("generating"); handleGenerate(); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-violet-300 transition-colors hover:bg-white/5"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create All"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function QuestPlanner() {
  const [openMode, setOpenMode] = useState<PlannerMode | null>(null);

  return (
    <>
      <button
        onClick={() => setOpenMode("quest")}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500"
      >
        <span>&#x2728;</span> Quest Planner
      </button>
      <button
        onClick={() => setOpenMode("epic")}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500"
      >
        <span>&#x1F3F0;</span> Epic Planner
      </button>

      {openMode && (
        <PlannerModal mode={openMode} onClose={() => setOpenMode(null)} />
      )}
    </>
  );
}
