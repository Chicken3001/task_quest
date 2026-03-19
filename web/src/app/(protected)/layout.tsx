import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("task_quest_profiles")
    .select("username, xp, level, current_streak")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex-shrink-0 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-transform hover:scale-105"
          >
            <span className="text-2xl">&#x2694;&#xFE0F;</span>
            <span className="text-lg font-black text-white">Task Quest</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Leaderboard
            </Link>
            {profile?.username && (
              <Link
                href="/account"
                className="hidden rounded-full bg-violet-500/20 px-3 py-1 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/30 hover:text-white sm:block"
              >
                {profile.username}
              </Link>
            )}
            <form action="/api/auth/signout" method="post">
              <button className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-white/20 hover:text-white">
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
