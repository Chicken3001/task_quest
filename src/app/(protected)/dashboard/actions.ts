"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { XP_REWARDS, getLevel, type Difficulty } from "@/lib/xp";
import type { GeneratedEpic, GeneratedQuest } from "@/lib/types";

export async function addTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const difficulty = formData.get("difficulty") as Difficulty;
  const questId = (formData.get("quest_id") as string) || null;

  if (!title || !difficulty) throw new Error("Title and difficulty required");

  const xpReward = XP_REWARDS[difficulty];
  if (!xpReward) throw new Error("Invalid difficulty");

  await supabase.from("task_quest_tasks").insert({
    user_id: user.id,
    title,
    description,
    difficulty,
    xp_reward: xpReward,
    quest_id: questId,
  });

  revalidatePath("/dashboard");
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: task } = await supabase
    .from("task_quest_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!task) throw new Error("Task not found");

  await supabase
    .from("task_quest_tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);

  // Get current profile
  const { data: profile } = await supabase
    .from("task_quest_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Calculate new XP and level
  const newXp = profile.xp + task.xp_reward;
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

  // 2-level cascade: task → quest → epic
  let questCompleted = false;
  let epicCompleted = false;

  if (task.quest_id) {
    const { data: questTasks } = await supabase
      .from("task_quest_tasks")
      .select("status")
      .eq("quest_id", task.quest_id)
      .eq("user_id", user.id);

    if (questTasks && questTasks.every((t) => t.status === "completed")) {
      questCompleted = true;
      await supabase
        .from("task_quest_quests")
        .update({ status: "completed" })
        .eq("id", task.quest_id);

      // Check if all quests in the epic are done
      const { data: quest } = await supabase
        .from("task_quest_quests")
        .select("epic_id")
        .eq("id", task.quest_id)
        .single();

      if (quest?.epic_id) {
        const { data: epicQuests } = await supabase
          .from("task_quest_quests")
          .select("status")
          .eq("epic_id", quest.epic_id)
          .eq("user_id", user.id);

        if (epicQuests && epicQuests.every((q) => q.status === "completed")) {
          epicCompleted = true;
          await supabase
            .from("task_quest_epics")
            .update({ status: "completed" })
            .eq("id", quest.epic_id);
        }
      }
    }
  }

  revalidatePath("/dashboard");

  return { leveledUp: newLevel > profile.level, newLevel, questCompleted, epicCompleted };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("task_quest_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function createQuestWithTasks(quest: GeneratedQuest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: questRow, error: questErr } = await supabase
    .from("task_quest_quests")
    .insert({
      user_id: user.id,
      epic_id: null,
      name: quest.name,
      description: quest.description || null,
      plan_summary: quest.plan_summary || null,
    })
    .select("id")
    .single();

  if (questErr || !questRow) throw new Error("Failed to create quest");

  const taskRows = quest.tasks.map((t) => ({
    user_id: user.id,
    quest_id: questRow.id,
    title: t.title,
    description: t.description || null,
    difficulty: t.difficulty,
    xp_reward: XP_REWARDS[t.difficulty],
  }));

  await supabase.from("task_quest_tasks").insert(taskRows);

  revalidatePath("/dashboard");
}

export async function deleteQuest(questId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // FK cascades will remove child tasks
  await supabase
    .from("task_quest_quests")
    .delete()
    .eq("id", questId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function createEpicWithQuestsAndTasks(epic: GeneratedEpic) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: epicRow, error: epicErr } = await supabase
    .from("task_quest_epics")
    .insert({
      user_id: user.id,
      name: epic.name,
      description: epic.description || null,
      plan_summary: epic.plan_summary || null,
    })
    .select("id")
    .single();

  if (epicErr || !epicRow) throw new Error("Failed to create epic");

  for (const quest of epic.quests) {
    const { data: questRow, error: questErr } = await supabase
      .from("task_quest_quests")
      .insert({
        user_id: user.id,
        epic_id: epicRow.id,
        name: quest.name,
        description: quest.description || null,
      })
      .select("id")
      .single();

    if (questErr || !questRow) throw new Error("Failed to create quest");

    const taskRows = quest.tasks.map((t) => ({
      user_id: user.id,
      quest_id: questRow.id,
      title: t.title,
      description: t.description || null,
      difficulty: t.difficulty,
      xp_reward: XP_REWARDS[t.difficulty],
    }));

    await supabase.from("task_quest_tasks").insert(taskRows);
  }

  revalidatePath("/dashboard");
}

export async function updateTaskNotes(taskId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("task_quest_tasks")
    .update({ notes })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function deleteEpic(epicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // FK cascades will remove child quests and tasks
  await supabase
    .from("task_quest_epics")
    .delete()
    .eq("id", epicId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}
