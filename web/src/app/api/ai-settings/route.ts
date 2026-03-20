import { authenticateRequest } from "@/lib/supabase/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { FREE_TIER_DAILY_LIMIT, GEMINI_URL } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await auth.supabase
    .from("task_quest_ai_settings")
    .select("gemini_api_key, daily_request_count, last_request_date")
    .eq("id", auth.user.id)
    .single();

  const todayStr = new Date().toISOString().split("T")[0];
  const dailyUsage =
    settings?.last_request_date === todayStr
      ? settings.daily_request_count
      : 0;

  return NextResponse.json({
    hasApiKey: !!settings?.gemini_api_key,
    dailyUsage,
    dailyLimit: FREE_TIER_DAILY_LIMIT,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { geminiApiKey } = await req.json();

  // Remove key
  if (geminiApiKey === null) {
    await auth.supabase
      .from("task_quest_ai_settings")
      .upsert({ id: auth.user.id, gemini_api_key: null });
    return NextResponse.json({ success: true });
  }

  if (typeof geminiApiKey !== "string" || geminiApiKey.trim().length === 0) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }

  const key = geminiApiKey.trim();

  // Validate key with a lightweight Gemini call
  const testRes = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Hi" }] }],
      generationConfig: { maxOutputTokens: 1 },
    }),
  });

  if (!testRes.ok) {
    const status = testRes.status;
    if (status === 400 || status === 403) {
      return NextResponse.json({ error: "Invalid API key. Check that your key is correct and active." }, { status: 400 });
    }
    if (status === 429) {
      return NextResponse.json({ error: "API key is currently rate-limited by Google. Try again in a moment." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not validate API key. Please try again." }, { status: 400 });
  }

  // Save valid key
  await auth.supabase
    .from("task_quest_ai_settings")
    .upsert({ id: auth.user.id, gemini_api_key: key });

  return NextResponse.json({ success: true });
}
