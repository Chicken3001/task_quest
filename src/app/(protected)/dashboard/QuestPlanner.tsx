"use client";

import { useState, useRef, useEffect } from "react";
import { createEpicWithQuestsAndTasks } from "./actions";
import { DIFFICULTY_COLORS, XP_REWARDS, type Difficulty } from "@/lib/xp";
import type { ChatMessage, GeneratedEpic } from "@/lib/types";

type Step = "chat" | "generating" | "preview";

export function QuestPlanner() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epic, setEpic] = useState<GeneratedEpic | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // Start conversation when modal opens
  useEffect(() => {
    if (open && messages.length === 0) {
      sendToChat([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
    setStep("chat");
    setMessages([]);
    setInput("");
    setReadyToGenerate(false);
    setEpic(null);
    setError(null);
  }

  async function sendToChat(msgs: ChatMessage[]) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/quests/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setEpic(data.epic);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("chat");
    }
  }

  async function handleCreate() {
    if (!epic) return;
    setCreating(true);
    setError(null);
    try {
      await createEpicWithQuestsAndTasks(epic);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setCreating(false);
    }
  }

  const totalQuests = epic?.quests.length ?? 0;
  const totalTasks = epic?.quests.reduce((sum, q) => sum + q.tasks.length, 0) ?? 0;
  const totalXp = epic?.quests
    .flatMap((q) => q.tasks)
    .reduce((sum, t) => sum + XP_REWARDS[t.difficulty], 0) ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500"
      >
        <span>&#x2728;</span> Quest Planner
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative flex w-full max-w-2xl flex-col max-h-[85vh] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-[var(--card-border)] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {step === "chat" && "Quest Planner"}
                    {step === "generating" && "Generating Plan..."}
                    {step === "preview" && "Preview Plan"}
                  </h2>
                  <p className="text-sm text-violet-400">
                    {step === "chat" && "Chat with AI to plan your project"}
                    {step === "generating" && "Creating your epic quest breakdown"}
                    {step === "preview" && `${totalQuests} quests \u00B7 ${totalTasks} tasks \u00B7 ${totalXp} XP`}
                  </p>
                </div>
                <button
                  onClick={handleClose}
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
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
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

                {/* Input area */}
                <div className="flex-shrink-0 border-t border-[var(--card-border)] px-6 py-4">
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
                      className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={sending || !input.trim()}
                      className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
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
                  <p className="text-sm text-violet-400">Building your quest plan...</p>
                </div>
              </div>
            )}

            {/* Preview step */}
            {step === "preview" && epic && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Epic header */}
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                    <h3 className="text-lg font-black text-white">{epic.name}</h3>
                    {epic.description && (
                      <p className="mt-1 text-sm text-violet-300">{epic.description}</p>
                    )}
                  </div>

                  {/* Quests */}
                  {epic.quests.map((quest, qi) => (
                    <div key={qi} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3">
                        <h4 className="font-bold text-white">{quest.name}</h4>
                        {quest.description && (
                          <p className="text-sm text-violet-400">{quest.description}</p>
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
                              +{XP_REWARDS[task.difficulty]} XP
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 border-t border-[var(--card-border)] px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStep("generating");
                        handleGenerate();
                      }}
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
      )}
    </>
  );
}
