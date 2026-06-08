// Shared dashboard shell for Phase 4.
// It gives every role page the same header, signed-in identity area, and logout
// behavior while each dashboard supplies its own body content.

import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { roleLabels, type AppRole } from "@/lib/session";

type DashboardShellProps = {
  user: {
    name: string;
    email: string;
    role: AppRole;
    title: string | null;
    district: { name: string } | null;
    school: { name: string } | null;
  };
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DashboardShell({
  user,
  eyebrow,
  title,
  description,
  children,
}: DashboardShellProps) {
  const scopeLabel = user.school?.name ?? user.district?.name ?? "No scope";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-50 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="border-b border-white/10 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                <p className="mt-2 text-xs text-cyan-200">
                  {roleLabels[user.role]} | {scopeLabel}
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-md border border-white/10 px-3 py-2 text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
              href="/"
            >
              Overview
            </Link>
            <Link
              className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-cyan-100"
              href="/dashboard"
            >
              My dashboard
            </Link>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
