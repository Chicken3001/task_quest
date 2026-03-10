import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLevelProgress } from "@/lib/xp";
import type { Profile, Epic, Quest, Task } from "@/lib/types";
import { TaskList } from "./TaskList";
import { AddTaskForm } from "./AddTaskForm";
import { QuestPlanner } from "./QuestPlanner";
import { EpicList } from "./EpicList";
import { StandaloneQuestList } from "./StandaloneQuestList";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("task_quest_profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  const { data: epics } = await supabase
    .from("task_quest_epics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Epic[]>();

  const { data: quests } = await supabase
    .from("task_quest_quests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Quest[]>();

  const { data: tasks } = await supabase
    .from("task_quest_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Task[]>();

  const allEpics = epics ?? [];
  const allQuests = quests ?? [];
  const allTasks = tasks ?? [];

  const standaloneQuests = allQuests.filter((q) => !q.epic_id);
  const standaloneTasks = allTasks.filter((t) => !t.quest_id);
  const standaloneActive = standaloneTasks.filter((t) => t.status === "active");
  const standaloneCompleted = standaloneTasks.filter((t) => t.status === "completed");

  const activeTasks = allTasks.filter((t) => t.status === "active");
  const completedTasks = allTasks.filter((t) => t.status === "completed");
  const { level, nextLevelXp, progress } = getLevelProgress(profile.xp);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Level & XP */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-400">Level</p>
              <p className="text-3xl font-black text-white">{level}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl shadow-lg shadow-violet-500/25">
              &#x2B50;
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs font-medium text-violet-400">
              <span>{profile.xp} XP</span>
              <span>{nextLevelXp} XP</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-400">Streak</p>
              <p className="text-3xl font-black text-white">
                {profile.current_streak}
                <span className="ml-1 text-lg text-violet-400">days</span>
              </p>
            </div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-2xl shadow-lg shadow-orange-500/25"
              style={{
                animation:
                  profile.current_streak > 0
                    ? "streak-fire 1.5s ease-in-out infinite"
                    : "none",
              }}
            >
              &#x1F525;
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-violet-400">
            Best: {profile.longest_streak} days
          </p>
        </div>

        {/* Task stats */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-400">Tasks</p>
              <p className="text-3xl font-black text-white">
                {completedTasks.length}
                <span className="ml-1 text-lg text-violet-400">done</span>
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl shadow-lg shadow-emerald-500/25">
              &#x1F4DC;
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-violet-400">
            {activeTasks.length} active
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <AddTaskForm epics={allEpics} quests={allQuests} />
        <QuestPlanner />
      </div>

      {/* Epics (3-tier) */}
      {allEpics.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-white">
            Epics ({allEpics.length})
          </h2>
          <EpicList epics={allEpics} quests={allQuests} tasks={allTasks} />
        </div>
      )}

      {/* Standalone Quests (from Quest Planner) */}
      {standaloneQuests.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-white">
            Quests ({standaloneQuests.length})
          </h2>
          <StandaloneQuestList quests={standaloneQuests} tasks={allTasks} />
        </div>
      )}

      {/* Standalone Active Tasks */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-white">
          Active Tasks ({standaloneActive.length})
        </h2>
        {standaloneActive.length === 0 && allEpics.length === 0 && standaloneQuests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)]/50 p-8 text-center">
            <p className="text-violet-400">
              No active tasks. Add one above or use the Quest/Epic Planner!
            </p>
          </div>
        ) : standaloneActive.length > 0 ? (
          <TaskList tasks={standaloneActive} type="active" />
        ) : null}
      </div>

      {/* Standalone Completed Tasks */}
      {standaloneCompleted.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-white">
            Completed ({standaloneCompleted.length})
          </h2>
          <TaskList tasks={standaloneCompleted} type="completed" />
        </div>
      )}
    </div>
  );
}
