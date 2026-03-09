import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SYSTEM_PROMPT = `You are a friendly project planning assistant. Your job is to have a short conversation to understand what the user wants to build, then signal when you have enough information to generate a structured project plan.

Rules:
- Ask clarifying questions to understand scope, tech stack, target users, and key features.
- Each response MUST include 2-4 suggested responses the user can click (short, natural phrases).
- Reach readyToGenerate: true within 2-4 exchanges (don't drag it out).
- Do NOT generate the actual plan — just gather information.
- Keep your messages concise and conversational (2-3 sentences max).
- When you have enough info, set readyToGenerate to true and say something like "I have a good picture now! Click Generate Plan when you're ready."

You MUST respond with valid JSON matching this schema:
{
  "message": "string",
  "suggestedResponses": ["string", "string"],
  "readyToGenerate": false
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  const { messages } = await req.json();

  // Map messages to Gemini format
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
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini chat error:", err);
    return NextResponse.json({ error: "Failed to get response. Please try again." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  let parsed: { message: string; suggestedResponses: string[]; readyToGenerate: boolean };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid response from Gemini" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
