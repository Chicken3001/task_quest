import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `You are a project planning assistant. Break the user's project description into logical epics (groups of related work) and individual quests (tasks) within each epic.

Rules:
- Create 2–6 epics, each with 2–6 quests.
- Assign each quest a difficulty:
  - easy: ~30 min, simple/routine task
  - medium: 1–3 hours, moderate complexity
  - hard: half day or more, significant effort
  - epic: multi-day or highly complex milestone
- Return ONLY valid JSON matching this exact schema:
{
  "epics": [
    {
      "name": "string",
      "description": "string",
      "quests": [
        {
          "title": "string",
          "description": "string",
          "difficulty": "easy" | "medium" | "hard" | "epic"
        }
      ]
    }
  ]
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

  const { description } = await req.json();
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json({ error: "Description too short" }, { status: 400 });
  }

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: description.trim() }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });

  let parsed: { epics: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 502 });
  }

  if (!Array.isArray(parsed.epics) || parsed.epics.length === 0) {
    return NextResponse.json({ error: "Unexpected response shape from Gemini" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
