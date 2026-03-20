import { authenticateRequest } from "@/lib/supabase/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { GEMINI_PRO_URL, DEFAULT_RESEARCH_CREDITS } from "@/lib/gemini";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "~30 min, routine",
  medium: "1-3 hours, moderate",
  hard: "half day+, significant",
  epic: "multi-day, complex",
};

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, context } = await req.json();
  if (!taskId || !context?.taskTitle) {
    return NextResponse.json({ error: "Task ID and context required" }, { status: 400 });
  }

  // Check credits
  const { data: settings } = await auth.supabase
    .from("task_quest_ai_settings")
    .select("gemini_api_key, research_credits")
    .eq("id", auth.user.id)
    .single();

  const credits = settings?.research_credits ?? DEFAULT_RESEARCH_CREDITS;
  if (credits <= 0) {
    return NextResponse.json(
      { error: "No research credits remaining.", code: "NO_RESEARCH_CREDITS" },
      { status: 403 }
    );
  }

  // Resolve API key (user key or server key, no daily counter for research)
  const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const { taskTitle, taskDescription, difficulty, questName, questDescription, planSummary } = context;
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] ?? difficulty;

  const systemPrompt = `You are a thorough research assistant helping a user complete a specific task within a larger project. Use web search to find current, reliable information and produce a comprehensive, actionable guide.

PROJECT CONTEXT:
${planSummary ? `Plan Summary: ${planSummary}` : ""}
${questName ? `Quest: ${questName}` : ""}
${questDescription ? `Quest Description: ${questDescription}` : ""}
Task: ${taskTitle}
${taskDescription ? `Task Description: ${taskDescription}` : ""}
Estimated Effort: ${difficulty} (${difficultyLabel})

INSTRUCTIONS:
- Research this specific task thoroughly using web search.
- Consider how this task fits within the broader quest/project context above.
- Provide step-by-step instructions, best practices, and practical advice.
- Include specific tools, products, services, or resources with links where relevant.
- If there are multiple valid approaches, briefly compare them and recommend one.
- Flag any common pitfalls, gotchas, or things to watch out for.
- Tailor the depth of research to the task's difficulty level.
- Structure your response with clear headings and bullet points.
- Start directly with the content — no preamble like "Here is my research".`;

  const userMessage = `Research everything I need to know to complete this task: "${taskTitle}"${
    taskDescription ? `\nDetails: ${taskDescription}` : ""
  }${questName ? `\nThis is part of the "${questName}" quest${questDescription ? `: ${questDescription}` : ""}.` : ""}${
    planSummary ? `\nProject context: ${planSummary}` : ""
  }`;

  // Call Gemini Pro with Google Search grounding
  const geminiRes = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini research error:", err);
    if (settings?.gemini_api_key) {
      const status = geminiRes.status;
      if (status === 400 || status === 403) {
        return NextResponse.json({ error: "Your API key appears to be invalid or disabled.", code: "INVALID_USER_KEY" }, { status: 502 });
      }
      if (status === 429) {
        return NextResponse.json({ error: "Your API key has been rate-limited by Google. Wait a moment and try again.", code: "USER_KEY_RATE_LIMITED" }, { status: 502 });
      }
    }
    return NextResponse.json({ error: "Research request failed. Please try again." }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return NextResponse.json({ error: "Empty response from research" }, { status: 502 });

  // Extract sources from grounding metadata
  const chunks = geminiData?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .filter((c: { web?: { title?: string; uri?: string } }) => c.web)
    .map((c: { web: { title?: string; uri?: string } }, i: number) => `${i + 1}. ${c.web.title ?? "Source"} - ${c.web.uri ?? ""}`)
    .join("\n");
  const result = sources ? `${text}\n\n---\nSources:\n${sources}` : text;

  // Append to task notes
  const { data: taskData } = await auth.supabase
    .from("task_quest_tasks")
    .select("notes")
    .eq("id", taskId)
    .single();

  const existingNotes = taskData?.notes ?? "";
  const newNotes = existingNotes ? `${existingNotes}\n\n---\n\n${result}` : result;

  await auth.supabase
    .from("task_quest_tasks")
    .update({ notes: newNotes })
    .eq("id", taskId);

  // Decrement credits
  const creditsRemaining = credits - 1;
  if (settings) {
    await auth.supabase
      .from("task_quest_ai_settings")
      .update({ research_credits: creditsRemaining })
      .eq("id", auth.user.id);
  } else {
    await auth.supabase
      .from("task_quest_ai_settings")
      .insert({ id: auth.user.id, research_credits: creditsRemaining });
  }

  return NextResponse.json({ result, creditsRemaining });
}
