import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GEMINI_URL } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  const { messages, context } = await req.json();

  if (!context || !context.taskTitle) {
    return NextResponse.json({ error: "Task context required" }, { status: 400 });
  }

  const systemPrompt = `You are a helpful task assistant. The user is working on a specific task and may ask questions about how to approach it, clarify requirements, or get suggestions.

Here is the context for this task:
${context.planSummary ? `Project Plan Summary: ${context.planSummary}` : ""}
${context.questName ? `Quest: ${context.questName}` : ""}
${context.questDescription ? `Quest Description: ${context.questDescription}` : ""}
Task: ${context.taskTitle}
${context.taskDescription ? `Task Description: ${context.taskDescription}` : ""}
Difficulty: ${context.difficulty}

Rules:
- Be concise and helpful (2-4 sentences per response).
- Answer questions about the task, suggest approaches, or help break it down further.
- Stay focused on this specific task and its context.
- Do not use markdown formatting — plain text only.`;

  const contents = (
    Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: "user", content: "Hello" }]
  ).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini task-chat error:", err);
    return NextResponse.json({ error: "Failed to get response." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  return NextResponse.json({ message: raw });
}
