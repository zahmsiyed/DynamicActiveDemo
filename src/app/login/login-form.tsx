"use client";

// This client component owns the login form because it needs browser
// interactivity: form state, submit handling, and navigation after login.

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        safeRedirectPath(requestedPath, result.redirectPath || "/dashboard"),
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="py-8">
        <div className="inline-flex rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-coral">
          DynamicActive
        </div>

        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-brand-ink sm:text-6xl">
          Classroom evaluation that feels clear, human, and ready to use.
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
          Sign in as a district admin, school admin, or teacher to review the
          classroom evaluation workflow through each role&apos;s lens.
        </p>

        <p className="mt-8 text-sm text-brand-muted">
          Private recordings, evidence-linked suggestions, and human-reviewed
          reports.
        </p>
      </section>

      <section className="rounded-[2rem] border border-brand-line bg-brand-card p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-coral">
            Secure login
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink">
            Sign in to your district
          </h2>
          <p className="mt-3 text-sm leading-6 text-brand-muted">
            Use the account invitation sent by your district administrator.
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

        <a className="mt-6 block underline" href="/recover">
          Forgot password?
        </a>
      </section>
    </div>
  );
}
