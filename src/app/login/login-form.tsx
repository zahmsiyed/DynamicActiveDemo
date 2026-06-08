"use client";

// This client component owns the login form because it needs browser
// interactivity: form state, submit handling, and navigation after login.

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

// These are the seeded Phase 2 accounts. Clicking a button fills the form so
// the auth flow is easy to test while learning.
const demoAccounts = [
  {
    role: "District Admin",
    email: "district@example.com",
    password: "password123",
  },
  {
    role: "School Admin",
    email: "school@example.com",
    password: "password123",
  },
  {
    role: "Teacher",
    email: "teacher@example.com",
    password: "password123",
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("teacher@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // The middleware may send users to /login?next=/some/path.
  // After login, we prefer that next path when it exists.
  const requestedPath = searchParams.get("next");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        redirectPath?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Login failed.");
        return;
      }

      // Refresh makes server components read the new cookie immediately.
      router.push(requestedPath || result.redirectPath || "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Phase 3 Auth
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Sign in with a seeded account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This phase checks the database user, verifies the hashed password,
          signs a secure cookie, and redirects by role.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Email</span>
          <input
            className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">Password</span>
          <input
            className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-md bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-sm font-medium text-slate-200">Demo accounts</p>
        <div className="mt-3 grid gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-left text-sm transition hover:border-cyan-300/60"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setError("");
              }}
            >
              <span className="font-medium text-white">{account.role}</span>
              <span className="mt-1 block text-slate-400">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
