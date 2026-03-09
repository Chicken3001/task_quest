import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SYSTEM_PROMPT = `You are a project planning assistant. Based on the conversation history, generate a structured project breakdown.

Rules:
- Create exactly ONE epic — the user's whole project.
- The epic name MUST be a single PascalCase word (e.g., "RecipeApp", "FitnessTracker").
- Create 2-6 quests (groups of related work) within the epic.
- Each quest has 2-6 tasks (individual action items).
- Assign each task a difficulty:
  - easy: ~30 min, simple/routine task
  - medium: 1-3 hours, moderate complexity
  - hard: half day or more, significant effort
  - epic: multi-day or highly complex milestone

Return ONLY valid JSON matching this exact schema:
{
  "epic": {
    "name": "string (single PascalCase word)",
    "description": "string",
    "quests": [
      {
        "name": "string",
        "description": "string",
        "tasks": [
          {
            "title": "string",
            "description": "string",
            "difficulty": "easy" | "medium" | "hard" | "epic"
          }
        ]
      }
    ]
  }
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
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No conversation history provided" }, { status: 400 });
  }

  // Map messages to Gemini format
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Add a final user message to trigger generation
  contents.push({
    role: "user",
    parts: [{ text: "Now generate the full project breakdown based on our conversation." }],
  });

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
    console.error("Gemini generate error:", err);
    return NextResponse.json({ error: "Failed to generate plan. Please try again." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  let parsed: { epic: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 502 });
  }

  if (!parsed.epic || typeof parsed.epic !== "object") {
    return NextResponse.json({ error: "Unexpected response shape from Gemini" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
