import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-lg text-center">
        <div className="mb-6 inline-flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-6xl shadow-[0_0_40px_rgba(139,92,246,0.4)]">
          <span role="img" aria-label="sword">&#x2694;&#xFE0F;</span>
        </div>

        <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
          Task Quest
        </h1>
        <p className="mt-3 text-lg text-violet-300">
          Turn boring tasks into epic quests. Earn XP, level up, maintain
          streaks, and compete on the leaderboard.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-lg font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/50 hover:brightness-110"
          >
            Start Your Quest
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="text-3xl">&#x2B50;</div>
            <p className="mt-1 text-sm font-semibold text-violet-300">Earn XP</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="text-3xl">&#x1F525;</div>
            <p className="mt-1 text-sm font-semibold text-violet-300">Streaks</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="text-3xl">&#x1F3C6;</div>
            <p className="mt-1 text-sm font-semibold text-violet-300">Leaderboard</p>
          </div>
        </div>
      </div>
    </div>
  );
}
