"use client";

// This client component owns the login form because it needs browser
// interactivity: form state, submit handling, and navigation after login.

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

// These are the seeded demo accounts. Clicking a button fills the form so the
// auth flow is easy to test while learning.
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

const productSignals = [
  { label: "Reports ready", value: "x" },
  { label: "AI insights", value: "x" },
  { label: "Avg score", value: "x" },
];

const observationSignalRows = [
  { colorClass: "bg-brand-coral", label: "Teacher talk", width: 62 },
  { colorClass: "bg-brand-gold", label: "Student talk", width: 38 },
  { colorClass: "bg-emerald-400", label: "Clarity", width: 84 },
];

function safeRedirectPath(requestedPath: string | null, fallbackPath: string) {
  if (!requestedPath) return fallbackPath;
  if (!requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return fallbackPath;
  }

  if (requestedPath === "/login" || requestedPath === "/dashboard") {
    return fallbackPath;
  }

  const isAllowedDashboardPath =
    requestedPath.startsWith("/dashboard/") &&
    requestedPath.startsWith(fallbackPath);
  const isAllowedObservationPath = requestedPath.startsWith("/observations/");

  if (!isAllowedDashboardPath && !isAllowedObservationPath) {
    return fallbackPath;
  }

  return requestedPath;
}

async function readLoginResult(response: Response) {
  try {
    return (await response.json()) as {
      error?: string;
      redirectPath?: string;
    };
  } catch {
    return {
      error: response.ok
        ? "Login returned an unexpected response."
        : "Login is temporarily unavailable.",
    };
  }
}

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
      let response: Response;

      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
      } catch {
        setError("Login is temporarily unavailable.");
        return;
      }

      const result = await readLoginResult(response);

      if (!response.ok) {
        setError(result.error ?? "Login failed.");
        return;
      }

      // Refresh makes server components read the new cookie immediately.
      router.push(
        safeRedirectPath(requestedPath, result.redirectPath || "/dashboard")
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="py-8">
        <div className="inline-flex rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-coral">
          Dynamic Active prototype
        </div>

        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-brand-ink sm:text-6xl">
          Classroom evaluation that feels clear, human, and ready to use.
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
          Sign in as a district admin, school admin, or teacher to review the
          same seeded workflow through each role&apos;s lens.
        </p>

        <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
          {productSignals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-[1.25rem] border border-brand-line bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
                {signal.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-brand-ink">
                {signal.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-2xl rounded-[2rem] border border-brand-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-ink">
                Observation signal
              </p>
              <p className="mt-1 text-sm text-brand-muted">
                Seeded reports include scores, feedback, transcripts, and AI
                recommendations.
              </p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-coral-dark">
              Local demo
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {observationSignalRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs text-brand-muted">
                  <span>{row.label}</span>
                  <span>x%</span>
                </div>
                <div className="h-2 rounded-full bg-brand-soft">
                  <div
                    className={`h-2 rounded-full ${row.colorClass}`}
                    style={{ width: `${row.width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-brand-line bg-brand-card p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-coral">
            Secure demo login
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink">
            Sign in with a seeded account
          </h2>
          <p className="mt-3 text-sm leading-6 text-brand-muted">
            The app checks the database user, verifies the hashed password,
            signs a secure cookie, and redirects by role.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-brand-ink">Email</span>
            <input
              className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-brand-ink outline-none transition placeholder:text-brand-muted/70 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-brand-ink">
              Password
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-brand-ink outline-none transition placeholder:text-brand-muted/70 focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-full bg-brand-coral px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-7 border-t border-brand-line pt-5">
          <p className="text-sm font-semibold text-brand-ink">Demo accounts</p>
          <div className="mt-3 grid gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="rounded-2xl border border-brand-line bg-white px-4 py-3 text-left text-sm transition hover:border-brand-coral hover:bg-brand-soft"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setError("");
                }}
              >
                <span className="font-semibold text-brand-ink">
                  {account.role}
                </span>
                <span className="mt-1 block text-brand-muted">
                  {account.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
