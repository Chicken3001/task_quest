import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const EPIC_PROMPT = `You are a project planning assistant. Based on the conversation history, generate a structured project breakdown.

Rules:
- Create exactly ONE epic — the user's whole project.
- The epic name MUST be 1-2 words (e.g., "Recipe App", "Fitness Tracker").
- Quest names and task titles MUST be normal readable text with spaces (e.g., "User Authentication", "Set up database schema"). Do NOT use PascalCase for these.
- Create the appropriate number of quests (groups of related work) to complete the epic.
- Each quest has 2-6 tasks (individual action items).
- The quests should be in a logical order, but they do not need to be strictly sequential. Some quests can be worked on in parallel.
- The tasks should be actionable and specific, not vague or high-level. They should represent concrete steps that can be taken to complete the quest.
- The tasks should be in a logical order within each quest, but they do not need to be strictly sequential. Some tasks can be worked on in parallel.
- Assign each task a difficulty:
  - easy: ~30 min, simple/routine task
  - medium: 1-3 hours, moderate complexity
  - hard: half day or more, significant effort
  - epic: multi-day or highly complex milestone

Return ONLY valid JSON matching this exact schema:
{
  "epic": {
    "name": "string (1-2 words)",
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

const QUEST_PROMPT = `You are a project planning assistant. Based on the conversation history, generate a single quest (a focused group of tasks) for a smaller project or goal.

Rules:
- Create exactly ONE quest with a clear name and description.
- The quest name MUST be normal readable text with spaces (e.g., "Portfolio Website", "Clean up garage").
- Create 2-8 tasks (individual action items) within the quest.
- The tasks should be actionable and specific, not vague or high-level.
- The tasks should be in a logical order, but they do not need to be strictly sequential.
- Assign each task a difficulty:
  - easy: ~30 min, simple/routine task
  - medium: 1-3 hours, moderate complexity
  - hard: half day or more, significant effort
  - epic: multi-day or highly complex milestone

Return ONLY valid JSON matching this exact schema:
{
  "quest": {
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

  const { messages, mode = "epic" } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No conversation history provided" }, { status: 400 });
  }

  const systemPrompt = mode === "quest" ? QUEST_PROMPT : EPIC_PROMPT;

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
    console.error("Gemini generate error:", err);
    return NextResponse.json({ error: "Failed to generate plan. Please try again." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 502 });
  }

  if (mode === "quest") {
    if (!parsed.quest || typeof parsed.quest !== "object") {
      return NextResponse.json({ error: "Unexpected response shape from Gemini" }, { status: 502 });
    }
  } else {
    if (!parsed.epic || typeof parsed.epic !== "object") {
      return NextResponse.json({ error: "Unexpected response shape from Gemini" }, { status: 502 });
    }
  }

  return NextResponse.json(parsed);
}
