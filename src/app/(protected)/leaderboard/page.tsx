import { createClient } from "@/lib/supabase/server";

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  current_streak: number;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("task_quest_profiles")
    .select("id, username, xp, level, current_streak")
    .not("username", "is", null)
    .order("xp", { ascending: false })
    .limit(50)
    .returns<LeaderboardEntry[]>();

  const entries = profiles ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-white">
        &#x1F3C6; Leaderboard
      </h1>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)]/50 p-8 text-center">
          <p className="text-violet-400">No adventurers yet. Be the first!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-sm font-semibold text-violet-400">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Adventurer</th>
                <th className="px-4 py-3 text-right">Level</th>
                <th className="px-4 py-3 text-right">XP</th>
                <th className="px-4 py-3 text-right">Streak</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isCurrentUser = entry.id === user?.id;
                const rank = i + 1;
                const medal =
                  rank === 1
                    ? "&#x1F947;"
                    : rank === 2
                      ? "&#x1F948;"
                      : rank === 3
                        ? "&#x1F949;"
                        : null;

                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-[var(--card-border)] last:border-0 ${
                      isCurrentUser ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-white">
                      {medal ? (
                        <span
                          dangerouslySetInnerHTML={{ __html: medal }}
                          className="text-lg"
                        />
                      ) : (
                        <span className="text-violet-400">#{rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {entry.username}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-violet-400">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-violet-300">
                      {entry.level}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-300">
                      {entry.xp.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-300">
                      {entry.current_streak > 0 && (
                        <span className="mr-1">&#x1F525;</span>
                      )}
                      {entry.current_streak}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
