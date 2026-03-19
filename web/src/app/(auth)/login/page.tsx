"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    // Auto sign-in after signup
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Account created! Please sign in.");
      setIsSignUp(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess("Check your email for a password reset link.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-4xl shadow-[0_0_30px_rgba(139,92,246,0.4)]">
            <span role="img" aria-label="sword">&#x2694;&#xFE0F;</span>
          </div>
          <h1 className="mt-3 text-3xl font-black text-white">Task Quest</h1>
        </Link>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-lg">
          <h2 className="mb-1 text-xl font-bold text-white">
            {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="mb-5 text-sm text-violet-400">
            {isForgot
              ? "We'll send you a reset link"
              : isSignUp
                ? "Start your quest adventure"
                : "Continue your quest"}
          </p>

          <form
            onSubmit={isForgot ? handleForgotPassword : isSignUp ? handleSignUp : handleLogin}
            className="flex flex-col gap-3"
          >
            {isSignUp && !isForgot && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className="rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            {!isForgot && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="rounded-xl border border-[var(--card-border)] bg-white/5 px-4 py-2.5 text-white placeholder-violet-400/50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2">
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                <p className="text-sm font-medium text-emerald-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : isForgot
                  ? "Send Reset Link"
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
            </button>
          </form>

          {!isForgot && (
            <p className="mt-4 text-center text-sm text-violet-400">
              {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="font-semibold text-violet-300 hover:text-white"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          )}

          {!isSignUp && (
            <p className={`${isForgot ? "mt-4" : "mt-2"} text-center text-sm text-violet-400`}>
              <button
                type="button"
                onClick={() => {
                  setIsForgot(!isForgot);
                  setError(null);
                  setSuccess(null);
                }}
                className="font-semibold text-violet-300 hover:text-white"
              >
                {isForgot ? "Back to Sign In" : "Forgot password?"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-lg font-bold text-violet-400">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
