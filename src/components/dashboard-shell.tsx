// Shared dashboard shell for Phase 4.
// It gives every role page the same header, signed-in identity area, and logout
// behavior while each dashboard supplies its own body content.

import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { roleDashboardPath, roleLabels, type AppRole } from "@/lib/session";

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
  const dashboardPath = roleDashboardPath(user.role);
  const navLinks = [
    {
      href: dashboardPath,
      label: `${roleLabels[user.role]} dashboard`,
      variant: "primary",
    },
    ...(user.role === "SCHOOL_ADMIN"
      ? [
          {
            href: "/observations/new",
            label: "Create observation",
            variant: "secondary",
          },
        ]
      : []),
  ];

  // Every dashboard and observation route now shares the same light brand shell.
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-brand-ink sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-brand-line bg-brand-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-coral">
                {eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-brand-muted">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-brand-soft p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-brand-ink">{user.name}</p>
                <p className="mt-1 text-xs text-brand-muted">{user.email}</p>
                <p className="mt-2 text-xs font-medium text-brand-coral">
                  {roleLabels[user.role]} | {scopeLabel}
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>

          <nav
            aria-label="Dashboard navigation"
            className="mt-6 flex flex-wrap gap-2 text-sm"
          >
            {navLinks.map((link) => (
              <Link
                className={
                  link.variant === "primary"
                    ? "rounded-full border border-brand-coral bg-brand-coral px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark"
                    : "rounded-full border border-brand-line bg-white px-4 py-2 font-medium text-brand-ink transition hover:border-brand-coral hover:text-brand-coral"
                }
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
