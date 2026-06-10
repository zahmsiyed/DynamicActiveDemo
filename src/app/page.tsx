// This file defines the `/` route because it is named `page.tsx`
// inside the `src/app` folder.
// In the Next.js App Router, every folder can become a route segment,
// and the `page.tsx` file is the visible UI for that route.

import Link from "next/link";

// These arrays keep static homepage copy near the UI while the page is simple.
// Dashboard and observation data now live in SQLite through Prisma.
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

// This list mirrors the core AI workflow from the assignment.
// File transcription and structured insight generation now exist in the app.
const workflowSteps = [
  "Record or upload classroom audio",
  "Transcribe the lesson",
  "Analyze participation and pacing",
  "Generate coaching recommendations",
];

// The default export is the React component that Next.js renders for `/`.
export default function Home() {
  return (
    // The outer wrapper establishes the page background and responsive padding.
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* This constrained container keeps the interface readable on wide screens. */}
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        {/* The top bar introduces the project name and links into authentication. */}
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              Phase 9 AI Insights
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Teacher Evaluation Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* This link takes users into the seeded authentication flow. */}
            <Link
              className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              href="/login"
            >
              Sign in
            </Link>

            {/* This status badge is static because deployment is not part of this phase. */}
            <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
              Local prototype
            </div>
          </div>
        </header>

        {/* The hero area explains what the first screen represents. */}
        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Classroom observation platform
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Build the evaluation workflow one layer at a time.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              This foundation gives us the first route, global styling, and a
              product direction. The database, seeded authentication layer, and
              role-specific dashboards are now in place. School admins can
              create scored observations, upload a classroom recording, and see
              finalized transcripts plus structured AI coaching insights when
              credentials and valid classroom evidence are available.
            </p>
          </div>

          {/* This visual panel previews the later classroom-audio analysis focus. */}
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-slate-400">Observation signal</p>
                <p className="mt-1 font-medium text-white">Structured insight</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                Phase 9
              </span>
            </div>

            {/* The waveform is a simple CSS-only visual, so no image assets are required. */}
            <div className="mt-6 flex h-28 items-end gap-2">
              {[42, 68, 34, 88, 56, 74, 45, 96, 64, 52, 78, 40].map(
                (height, index) => (
                  <div
                    // The index is stable because this static list never changes order.
                    key={index}
                    className="flex-1 rounded-t bg-cyan-300/80"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>

            {/* These labels reflect the structured fields Phase 9 stores. */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Talk time</p>
                <p className="mt-1 font-semibold text-white">Ready</p>
              </div>
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Questions</p>
                <p className="mt-1 font-semibold text-white">Ready</p>
              </div>
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Pacing</p>
                <p className="mt-1 font-semibold text-white">Ready</p>
              </div>
            </div>
          </div>
        </section>

        {/* Role cards keep the product requirements visible while we build each phase. */}
        <section className="grid gap-4 border-t border-white/10 py-8 md:grid-cols-3">
          {roleSummaries.map((role) => (
            <article
              key={role.title}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
            >
              <h3 className="font-semibold text-white">{role.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {role.description}
              </p>
            </article>
          ))}
        </section>

        {/* The workflow strip shows the main AI feature path in a compact form. */}
        <section className="border-t border-white/10 pt-8">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            AI workflow
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-white/10 bg-slate-900/80 p-4"
              >
                <p className="text-sm text-cyan-200">Step {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
