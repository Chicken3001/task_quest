import { authenticateRequest } from "@/lib/supabase/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { GEMINI_URL, resolveGeminiKey, FREE_TIER_DAILY_LIMIT } from "@/lib/gemini";

const EPIC_CHAT_PROMPT = `You are a friendly project planning assistant. Your job is to have a short conversation to understand what the user wants to build, then signal when you have enough information to generate a structured project plan with multiple quests and tasks.

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

const QUEST_CHAT_PROMPT = `You are a friendly planning assistant. Your job is to have a short conversation to understand a focused goal or small project the user wants to accomplish, then signal when you have enough information to generate a single quest with tasks.

Rules:
- This is for smaller, focused projects — a single quest with a list of tasks. Not a large multi-part epic.
- Ask 1-2 clarifying questions to understand what they want to accomplish and any constraints.
- Each response MUST include 2-4 suggested responses the user can click (short, natural phrases).
- Reach readyToGenerate: true within 1-3 exchanges (keep it quick).
- Do NOT generate the actual plan — just gather information.
- Keep your messages concise and conversational (2-3 sentences max).
- When you have enough info, set readyToGenerate to true and say something like "Got it! Click Generate Plan when you're ready."

You MUST respond with valid JSON matching this schema:
{
  "message": "string",
  "suggestedResponses": ["string", "string"],
  "readyToGenerate": false
}`;

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

  const { messages, mode = "epic", includePersonalInfo = false } = await req.json();

  let systemPrompt = mode === "quest" ? QUEST_CHAT_PROMPT : EPIC_CHAT_PROMPT;

  if (includePersonalInfo) {
    const { data: profile } = await auth.supabase
      .from("task_quest_profiles")
      .select("personal_info")
      .eq("id", auth.user.id)
      .single();
    if (profile?.personal_info) {
      systemPrompt += `\n\nThe user has shared the following personal context. Use this to tailor your planning to their background:\n---\n${profile.personal_info}\n---`;
    }
  }

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
      system_instruction: { parts: [{ text: systemPrompt }] },
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
    if (keyResult.isUserKey) {
      const status = geminiRes.status;
      if (status === 400 || status === 403) {
        return NextResponse.json({ error: "Your API key appears to be invalid or disabled. Check your key in Settings.", code: "INVALID_USER_KEY" }, { status: 502 });
      }
      if (status === 429) {
        return NextResponse.json({ error: "Your API key has been rate-limited by Google. Wait a moment and try again.", code: "USER_KEY_RATE_LIMITED" }, { status: 502 });
      }
    }
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
