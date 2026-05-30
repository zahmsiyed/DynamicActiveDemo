// This file defines the `/` route because it is named `page.tsx`
// inside the `src/app` folder.
// In the Next.js App Router, every folder can become a route segment,
// and the `page.tsx` file is the visible UI for that route.

// These arrays keep the Phase 1 page data near the UI while the project
// is still small. Later phases can move data into a database.
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
// For Phase 1, it is only displayed as product direction.
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
        {/* The top bar introduces the project name without adding routing yet. */}
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              Phase 1 Foundation
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Teacher Evaluation Studio
            </h1>
          </div>

          {/* This status badge is static for now; later phases can make it dynamic. */}
          <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
            Local prototype
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
              product direction before we add data, authentication, dashboards,
              observations, transcription, and AI insights.
            </p>
          </div>

          {/* This visual panel previews the classroom-audio analysis focus. */}
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-slate-400">Observation signal</p>
                <p className="mt-1 font-medium text-white">Future AI transcript</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                Planned
              </span>
            </div>

            {/* The waveform is a simple CSS-only visual so Phase 1 has no asset dependencies. */}
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

            {/* These labels preview the future metrics without implementing them yet. */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Talk time</p>
                <p className="mt-1 font-semibold text-white">Future</p>
              </div>
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Questions</p>
                <p className="mt-1 font-semibold text-white">Future</p>
              </div>
              <div className="rounded-md bg-slate-900/80 p-3">
                <p className="text-slate-400">Pacing</p>
                <p className="mt-1 font-semibold text-white">Future</p>
              </div>
            </div>
          </div>
        </section>

        {/* Role cards help us keep the product requirements visible during Phase 1. */}
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
            Future AI workflow
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
