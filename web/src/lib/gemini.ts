import { SupabaseClient } from "@supabase/supabase-js";

const GEMINI_MODEL = "gemini-3-flash-preview";

export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const FREE_TIER_DAILY_LIMIT = 15;
const COOLDOWN_SECONDS = 4;

export type GeminiKeyResult =
  | { apiKey: string; isUserKey: boolean }
  | { error: "cooldown"; retryAfter: number }
  | { error: "daily_limit" };

export async function resolveGeminiKey(
  supabase: SupabaseClient,
  userId: string
): Promise<GeminiKeyResult> {
  const { data: settings } = await supabase
    .from("task_quest_ai_settings")
    .select("gemini_api_key, daily_request_count, last_request_date, last_request_at")
    .eq("id", userId)
    .single();

  // If user has their own key, use it with no limits
  if (settings?.gemini_api_key) {
    return { apiKey: settings.gemini_api_key, isUserKey: true };
  }

  // Server key required
  const serverKey = process.env.GEMINI_API_KEY;
  if (!serverKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Check cooldown (server key only)
  if (settings?.last_request_at) {
    const lastAt = new Date(settings.last_request_at);
    const elapsed = (now.getTime() - lastAt.getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return { error: "cooldown", retryAfter: Math.ceil(COOLDOWN_SECONDS - elapsed) };
    }
  }

  // No existing row — create one
  if (!settings) {
    await supabase.from("task_quest_ai_settings").insert({
      id: userId,
      daily_request_count: 1,
      last_request_date: todayStr,
      last_request_at: now.toISOString(),
    });
    return { apiKey: serverKey, isUserKey: false };
  }

  // New day — reset count
  if (settings.last_request_date !== todayStr) {
    await supabase
      .from("task_quest_ai_settings")
      .update({
        daily_request_count: 1,
        last_request_date: todayStr,
        last_request_at: now.toISOString(),
      })
      .eq("id", userId);
    return { apiKey: serverKey, isUserKey: false };
  }

  // Check daily limit
  if (settings.daily_request_count >= FREE_TIER_DAILY_LIMIT) {
    return { error: "daily_limit" };
  }

  // Increment and allow
  await supabase
    .from("task_quest_ai_settings")
    .update({
      daily_request_count: settings.daily_request_count + 1,
      last_request_at: now.toISOString(),
    })
    .eq("id", userId);

  return { apiKey: serverKey, isUserKey: false };
}
