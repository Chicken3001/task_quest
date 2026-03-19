"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("task_quest_profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username ?? "");
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleUpdateUsername(e: React.FormEvent) {
    e.preventDefault();
    setSavingUsername(true);
    setUsernameMsg(null);

    if (username.length < 3 || username.length > 20) {
      setUsernameMsg({ type: "error", text: "Username must be 3-20 characters" });
      setSavingUsername(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if username is taken by someone else
    const { data: existing } = await supabase
      .from("task_quest_profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .single();

    if (existing) {
      setUsernameMsg({ type: "error", text: "Username is already taken" });
      setSavingUsername(false);
      return;
    }

    const { error } = await supabase
      .from("task_quest_profiles")
      .update({ username })
      .eq("id", user.id);

    setSavingUsername(false);
    if (error) {
      setUsernameMsg({ type: "error", text: "Failed to update username" });
    } else {
      setUsernameMsg({ type: "success", text: "Username updated" });
      router.refresh();
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }

    setSavingPassword(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg font-bold text-violet-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-black text-white">Account Settings</h1>

      {/* Username */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Profile</h2>
        <form onSubmit={handleUpdateUsername} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-violet-400">Email</label>
            <p className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-violet-300">
              {email}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-violet-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          {usernameMsg && (
            <p className={`text-sm font-medium ${usernameMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {usernameMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingUsername}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
          >
            {savingUsername ? "Saving..." : "Update Username"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Change Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-violet-400">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-violet-400">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-sm text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          {passwordMsg && (
            <p className={`text-sm font-medium ${passwordMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {passwordMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
          >
            {savingPassword ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
