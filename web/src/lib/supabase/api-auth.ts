import { createClient as createServerClient } from "./server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * Authenticate an API request via cookie (web) or Bearer token (iOS).
 * Returns { supabase, user } or null if unauthenticated.
 */
export async function authenticateRequest(req: NextRequest) {
  // Try cookie auth first (web flow)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { supabase, user };

  // Fall back to Bearer token (iOS flow)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabaseWithToken = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user: tokenUser },
  } = await supabaseWithToken.auth.getUser(token);

  if (!tokenUser) return null;

  return { supabase: supabaseWithToken, user: tokenUser };
}
