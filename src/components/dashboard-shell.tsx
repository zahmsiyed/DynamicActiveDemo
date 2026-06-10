// It gives every role page the same header, signed-in identity area, and logout
// behavior while each dashboard supplies its own body content.

import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getNotificationCenter } from "@/lib/notifications";
import { roleDashboardPath, roleLabels, type AppRole } from "@/lib/session";

type DashboardShellProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: AppRole;
    title: string | null;
    district: { name: string } | null;
    school: { name: string } | null;
  };
  eyebrow: string;
  hideDashboardLink?: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
};

function formatNotificationDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export async function DashboardShell({
  user,
  eyebrow,
  hideDashboardLink = false,
  title,
  description,
  children,
}: DashboardShellProps) {
  const scopeLabel = user.school?.name ?? user.district?.name ?? "No scope";
  const dashboardPath = roleDashboardPath(user.role);
  const notificationCenter = await getNotificationCenter(user.id);
  const hasNotificationActivity =
    notificationCenter.notifications.length > 0 ||
    notificationCenter.emailLogs.length > 0;
  const navLinks = [
    ...(!hideDashboardLink
      ? [
          {
            href: dashboardPath,
            label: `${roleLabels[user.role]} dashboard`,
            variant: "primary",
          },
        ]
      : []),
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

          {navLinks.length ? (
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
          ) : null}
        </header>

        {hasNotificationActivity ? (
          <section className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-brand-ink">Notifications</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Report activity and simulated email delivery for this account.
                </p>
              </div>

              <span className="w-fit rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold text-brand-coral-dark">
                {notificationCenter.unreadCount} unread
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {notificationCenter.notifications.length ? (
                  notificationCenter.notifications.map((notification) => {
                    const content = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-brand-ink">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-brand-muted">
                              {notification.body}
                            </p>
                          </div>
                          {!notification.readAt ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-coral" />
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs font-medium text-brand-muted">
                          {formatNotificationDate(notification.createdAt)}
                        </p>
                      </>
                    );

                    return notification.observationId ? (
                      <Link
                        className="block rounded-[1.25rem] border border-brand-line bg-white p-4 transition hover:border-brand-coral"
                        href={`/observations/${notification.observationId}`}
                        key={notification.id}
                      >
                        {content}
                      </Link>
                    ) : (
                      <article
                        className="rounded-[1.25rem] border border-brand-line bg-white p-4"
                        key={notification.id}
                      >
                        {content}
                      </article>
                    );
                  })
                ) : (
                  <article className="rounded-[1.25rem] border border-brand-line bg-white p-4">
                    <p className="text-sm font-semibold text-brand-ink">
                      No in-app notifications
                    </p>
                    <p className="mt-1 text-sm leading-6 text-brand-muted">
                      Report-ready messages will appear here when new finalized
                      reports are created.
                    </p>
                  </article>
                )}
              </div>

              <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
                <h3 className="text-sm font-semibold text-brand-ink">
                  Simulated email log
                </h3>
                {notificationCenter.emailLogs.length ? (
                  <div className="mt-3 space-y-3">
                    {notificationCenter.emailLogs.map((emailLog) => (
                      <div
                        className="border-t border-brand-line pt-3 first:border-t-0 first:pt-0"
                        key={emailLog.id}
                      >
                        <p className="text-sm font-semibold text-brand-ink">
                          {emailLog.subject}
                        </p>
                        <p className="mt-1 text-xs text-brand-muted">
                          {emailLog.email} | {emailLog.status} |{" "}
                          {formatNotificationDate(emailLog.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-brand-muted">
                    No simulated emails have been logged for this account yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {children}
      </div>
    </main>
  );
}
