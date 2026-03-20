import { authenticateRequest } from "@/lib/supabase/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { GEMINI_URL, resolveGeminiKey, FREE_TIER_DAILY_LIMIT } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyResult = await resolveGeminiKey(auth.supabase, auth.user.id);
  if ("error" in keyResult) {
    if (keyResult.error === "cooldown") {
      return NextResponse.json(
        { error: `Please wait ${keyResult.retryAfter} seconds between requests.`, code: "COOLDOWN" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: `Daily AI limit reached (${FREE_TIER_DAILY_LIMIT} requests). Add your own API key in Settings for unlimited usage.`, code: "RATE_LIMITED" },
      { status: 429 }
    );
  }
  const apiKey = keyResult.apiKey;

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
    if (keyResult.isUserKey) {
      const status = geminiRes.status;
      if (status === 400 || status === 403) {
        return NextResponse.json({ error: "Your API key appears to be invalid or disabled. Check your key in Settings.", code: "INVALID_USER_KEY" }, { status: 502 });
      }
      if (status === 429) {
        return NextResponse.json({ error: "Your API key has been rate-limited by Google. Wait a moment and try again.", code: "USER_KEY_RATE_LIMITED" }, { status: 502 });
      }
    }
    return NextResponse.json({ error: "Failed to get response." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  return NextResponse.json({ message: raw });
}
