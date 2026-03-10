import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password, username } = await request.json();

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "Email, password, and username are required" },
      { status: 400 }
    );
  }

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check if username is taken
  const { data: existing } = await supabase
    .from("task_quest_profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Username is already taken" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Upsert profile with username (trigger may or may not have created the row yet)
  if (data.user) {
    await supabase
      .from("task_quest_profiles")
      .upsert({ id: data.user.id, username }, { onConflict: "id" });
  }

  return NextResponse.json({ success: true });
}
