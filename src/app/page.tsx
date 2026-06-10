// Public overview for signed-out visitors; authenticated users redirect below.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { roleDashboardPath } from "@/lib/session";

// Static overview copy stays here because the public page does not read Prisma.
const roleSummaries = [
  {
    title: "District Admin",
    description: "District-wide visibility across schools, teachers, reports, and trends.",
  },
  {
    title: "School Admin",
    description: "Observation creation, classroom recording uploads, scoring, and feedback.",
  },
  {
    title: "Teacher",
    description: "A clear place to review feedback, transcripts, insights, and growth.",
  },
];

const workflowSteps = [
  "Record or upload classroom audio",
  "Transcribe the lesson",
  "Analyze participation and pacing",
  "Generate coaching recommendations",
];

const overviewStats = [
  { label: "Seeded roles", value: "3" },
  { label: "Reports", value: "7" },
  { label: "AI insights", value: "3" },
];

export default async function Home() {
  const user = await getCurrentUser();

  // Authenticated users should land on the app surface, not the public overview.
  if (user) {
    redirect(roleDashboardPath(user.role));
  }

  return (
    <main className="min-h-screen bg-background text-brand-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-brand-line bg-brand-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-coral">
              Dynamic Active prototype
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-ink">
              Teacher Evaluation Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="rounded-full bg-brand-coral px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <p className="inline-flex rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-coral">
              Classroom observation platform
            </p>
            <h2 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-brand-ink sm:text-6xl">
              Evaluation workflows for every classroom role.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
              A local prototype for district leaders, school administrators,
              and teachers to review observations, evidence, feedback, and AI
              coaching insights from the same seeded data model.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full bg-brand-coral px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark"
                href="/login"
              >
                Choose a demo role
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {overviewStats.map((stat) => (
                <div
                  className="rounded-[1.25rem] border border-brand-line bg-white p-4 shadow-sm"
                  key={stat.label}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-ink">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-brand-line bg-brand-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-brand-line pb-4">
              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  Observation readiness
                </p>
                <p className="mt-1 text-sm text-brand-muted">
                  Scores, transcript, insight, and report review.
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-coral-dark">
                Local prototype
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {[
                ["Rubric evidence", "Scored categories with notes", "Complete"],
                ["Classroom transcript", "Diarized lesson evidence", "Ready"],
                ["AI coaching insight", "Metrics and recommendations", "Ready"],
                ["Teacher report", "Feedback and growth history", "Review"],
              ].map(([title, detail, state]) => (
                <div
                  className="rounded-[1.25rem] border border-brand-line bg-brand-soft/70 p-4"
                  key={title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-ink">{title}</p>
                      <p className="mt-1 text-sm text-brand-muted">{detail}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-coral-dark">
                      {state}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-brand-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-brand-muted">
                <span>Student participation</span>
                <span>60%</span>
              </div>
              <div className="h-2 rounded-full bg-brand-soft">
                <div className="h-2 w-3/5 rounded-full bg-brand-coral" />
              </div>
            </div>
          </div>
        </section>

        {/* Role cards summarize the surfaces available after login. */}
        <section className="grid gap-4 border-t border-brand-line py-8 md:grid-cols-3">
          {roleSummaries.map((role) => (
            <article
              key={role.title}
              className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm"
            >
              <h3 className="font-semibold text-brand-ink">{role.title}</h3>
              <p className="mt-3 text-sm leading-6 text-brand-muted">
                {role.description}
              </p>
            </article>
          ))}
        </section>

        <section className="border-t border-brand-line pt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-coral">
            AI workflow
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-[1.25rem] border border-brand-line bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-brand-coral">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-muted">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
