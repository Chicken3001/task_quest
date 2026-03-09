"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { XP_REWARDS, getLevel, type Difficulty } from "@/lib/xp";

export async function addQuest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const difficulty = formData.get("difficulty") as Difficulty;

  if (!title || !difficulty) throw new Error("Title and difficulty required");

  const xpReward = XP_REWARDS[difficulty];
  if (!xpReward) throw new Error("Invalid difficulty");

  await supabase.from("task_quest_quests").insert({
    user_id: user.id,
    title,
    description,
    difficulty,
    xp_reward: xpReward,
  });

  revalidatePath("/dashboard");
}

export async function createEpicWithQuests(
  epics: {
    epicName: string;
    epicDescription: string;
    quests: { title: string; description: string; difficulty: Difficulty }[];
  }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  for (const epic of epics) {
    const { data: epicRow, error: epicErr } = await supabase
      .from("task_quest_epics")
      .insert({ user_id: user.id, name: epic.epicName, description: epic.epicDescription || null })
      .select("id")
      .single();

    if (epicErr || !epicRow) throw new Error("Failed to create epic");

    const questRows = epic.quests.map((q) => ({
      user_id: user.id,
      title: q.title,
      description: q.description || null,
      difficulty: q.difficulty,
      xp_reward: XP_REWARDS[q.difficulty],
      epic_id: epicRow.id,
    }));

    await supabase.from("task_quest_quests").insert(questRows);
  }

  revalidatePath("/dashboard");
}

export async function completeQuest(questId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get the quest
  const { data: quest } = await supabase
    .from("task_quest_quests")
    .select("*")
    .eq("id", questId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!quest) throw new Error("Quest not found");

  // Mark quest complete
  await supabase
    .from("task_quest_quests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", questId);

  // Get current profile
  const { data: profile } = await supabase
    .from("task_quest_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Calculate new XP and level
  const newXp = profile.xp + quest.xp_reward;
  const newLevel = getLevel(newXp);

  // Calculate streak
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const lastDate = profile.last_completed_date;

  let newStreak = profile.current_streak;
  if (lastDate === today) {
    // Already completed today, no streak change
  } else if (lastDate === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const newLongestStreak = Math.max(newStreak, profile.longest_streak);

  await supabase
    .from("task_quest_profiles")
    .update({
      xp: newXp,
      level: newLevel,
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_completed_date: today,
    })
    .eq("id", user.id);

  // Auto-complete epic if all its quests are done
  if (quest.epic_id) {
    const { data: epicQuests } = await supabase
      .from("task_quest_quests")
      .select("status")
      .eq("epic_id", quest.epic_id)
      .eq("user_id", user.id);

    if (epicQuests && epicQuests.every((q) => q.status === "completed")) {
      await supabase
        .from("task_quest_epics")
        .update({ status: "completed" })
        .eq("id", quest.epic_id);
    }
  }

  revalidatePath("/dashboard");

  return { leveledUp: newLevel > profile.level, newLevel };
}

export async function deleteQuest(questId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("task_quest_quests")
    .delete()
    .eq("id", questId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}
