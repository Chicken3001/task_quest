"use client";

import { useState, useRef, useEffect } from "react";

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

export function TaskChatTooltip({ context }: { context: TaskContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

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
    }
  }

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-400 transition-colors hover:bg-indigo-500/30 hover:text-indigo-300"
        aria-label="Ask about this task"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1C4.13 1 1 3.58 1 6.75c0 1.77 1.03 3.36 2.66 4.42L3 15l3.38-1.93C6.9 13.18 7.44 13.25 8 13.25c3.87 0 7-2.58 7-5.75S11.87 1 8 1z" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 flex w-80 flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
          style={{ maxHeight: "320px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-[var(--card-border)] px-3 py-2">
            <p className="text-xs font-bold text-violet-400 truncate">
              Ask about: {context.taskTitle}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: "200px" }}>
            {messages.length === 0 && (
              <p className="text-xs text-violet-500 text-center py-4">
                Ask a question about this task
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-violet-600/30 text-white"
                      : "bg-white/5 text-violet-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-2">
                  <span className="typing-dot" style={{ width: 5, height: 5 }} />
                  <span className="typing-dot" style={{ width: 5, height: 5, animationDelay: "0.2s" }} />
                  <span className="typing-dot" style={{ width: 5, height: 5, animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-[var(--card-border)] p-2">
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-violet-500 outline-none focus:border-violet-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
