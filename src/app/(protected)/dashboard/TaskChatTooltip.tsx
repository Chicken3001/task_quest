"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateTaskNotes } from "./actions";

interface TaskContext {
  taskTitle: string;
  taskDescription?: string | null;
  difficulty: string;
  questName?: string | null;
  questDescription?: string | null;
  planSummary?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function TaskChatTooltip({
  taskId,
  notes: initialNotes,
  context,
}: {
  taskId: string;
  notes: string | null;
  context: TaskContext;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [showNotesTooltip, setShowNotesTooltip] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (editingNotes) {
      setTimeout(() => notesRef.current?.focus(), 50);
    }
  }, [editingNotes]);

  function scrollToBottom() {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/quests/task-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Try again." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleSaveNotes() {
    setSummarizing(true);
    try {
      const res = await fetch("/api/quests/task-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            {
              role: "user",
              content:
                "Summarize the important takeaways from our conversation as concise bullet-point notes I can reference later. Only include actionable or useful information. Do not include any preamble.",
            },
          ],
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      const newNotes = notes ? notes + "\n\n" + data.message : data.message;
      setNotes(newNotes);
      setSummarizing(false);
      setEditingNotes(true);
    } catch {
      setSummarizing(false);
    }
  }

  async function handleCompactNotes() {
    setCompacting(true);
    try {
      const res = await fetch("/api/quests/task-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Here are my accumulated notes:\n\n${notes}\n\nCondense these notes into a shorter version. Merge duplicates, remove redundancy, and keep only the most important actionable information. Use concise bullet points. Do not include any preamble.`,
            },
          ],
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setNotes(data.message);
      setCompacting(false);
      setEditingNotes(true);
    } catch {
      setCompacting(false);
    }
  }

  async function handleSaveEditedNotes() {
    setSavingNotes(true);
    try {
      await updateTaskNotes(taskId, notes);
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }

  const modal = open && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative flex w-full max-w-2xl flex-col max-h-[85vh] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[var(--card-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Task Assistant</h2>
              <p className="text-sm text-violet-400">
                Ask about: {context.taskTitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-400 transition-colors hover:bg-violet-500/20 hover:text-violet-300"
                >
                  New Chat
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-400 hover:bg-red-500/20 hover:text-red-400"
              >
                &#x2715;
              </button>
            </div>
          </div>
        </div>

        {/* Saved notes display */}
        {notes && !editingNotes && (
          <div className="border-b border-[var(--card-border)]">
            <button
              onClick={() => setNotesExpanded((e) => !e)}
              className="flex w-full items-center gap-2 px-6 py-2 text-left transition-colors hover:bg-white/5"
            >
              <span className="text-xs text-violet-500">{notesExpanded ? "▼" : "▶"}</span>
              <span className="text-xs font-bold text-violet-400">Notes</span>
              {!notesExpanded && (
                <span className="min-w-0 flex-1 truncate text-xs text-violet-500">
                  {notes.split("\n")[0]}
                </span>
              )}
            </button>
            {notesExpanded && (
              <div className="px-6 pb-3">
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-sm text-violet-200 whitespace-pre-wrap">{notes}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 justify-end">
                  <button
                    onClick={handleCompactNotes}
                    disabled={compacting}
                    className="text-xs font-semibold text-amber-500 transition-colors hover:text-amber-300 disabled:opacity-50"
                  >
                    {compacting ? "Compacting..." : "Compact"}
                  </button>
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs font-semibold text-violet-500 transition-colors hover:text-violet-300"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editing notes */}
        {editingNotes && (
          <div className="border-b border-[var(--card-border)] px-6 py-3">
            <p className="text-xs font-bold text-violet-400 mb-1">Edit Notes</p>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            <div className="mt-2 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setNotes(initialNotes ?? "");
                  setEditingNotes(false);
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedNotes}
                disabled={savingNotes}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-violet-500 text-center py-8">
              Ask a question about this task
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
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
          ))}
          {(sending || summarizing) && (
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

        {/* Input */}
        <div className="flex-shrink-0 border-t border-[var(--card-border)] px-6 py-4">
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
              placeholder="Ask a question... can even be 'help me'"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
            >
              Send
            </button>
            {/* Save Notes button */}
            <div className="relative">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={messages.length === 0 || summarizing || sending}
                onMouseEnter={() => setShowNotesTooltip(true)}
                onMouseLeave={() => setShowNotesTooltip(false)}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
              >
                {summarizing ? "..." : "Save Notes"}
              </button>
              {showNotesTooltip && (
                <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 shadow-xl">
                  <p className="text-xs text-violet-300">
                    Summarizes the important takeaways from this conversation and saves them as notes on the task.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs transition-colors ${
          initialNotes
            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
            : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-300"
        }`}
        aria-label="Ask about this task"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1C4.13 1 1 3.58 1 6.75c0 1.77 1.03 3.36 2.66 4.42L3 15l3.38-1.93C6.9 13.18 7.44 13.25 8 13.25c3.87 0 7-2.58 7-5.75S11.87 1 8 1z" />
        </svg>
      </button>
      {modal}
    </>
  );
}
