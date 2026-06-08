"use client";

// Phase 5 observation creation form.
// This is a client component because it handles form state, rubric score state,
// submit loading, and client-side navigation after the API creates a report.

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

type TeacherOption = {
  id: string;
  name: string;
  email: string;
  title: string | null;
};

type RubricOption = {
  category: string;
  label: string;
  description: string;
};

type ScoreState = {
  category: string;
  score: number;
  note: string;
};

type ObservationFormProps = {
  teachers: TeacherOption[];
  rubric: RubricOption[];
};

// The date input wants yyyy-mm-dd, so this helper creates a stable default.
function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ObservationForm({ teachers, rubric }: ObservationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [title, setTitle] = useState("Classroom Observation");
  const [subject, setSubject] = useState("Science");
  const [gradeLevel, setGradeLevel] = useState("7");
  const [scheduledAt, setScheduledAt] = useState(todayInputValue());
  const [status, setStatus] = useState<"SCHEDULED" | "FINALIZED">("FINALIZED");
  const [summary, setSummary] = useState(
    "Students worked through a lesson segment while the observer collected evidence."
  );
  const [feedback, setFeedback] = useState(
    "Strong lesson structure. Next step: add more wait time after open-ended questions."
  );
  const [scores, setScores] = useState<ScoreState[]>(
    rubric.map((item) => ({
      category: item.category,
      score: 3,
      note: "",
    }))
  );

  // This lookup lets the score editor render labels/descriptions beside state.
  const rubricByCategory = useMemo(() => {
    return new Map(rubric.map((item) => [item.category, item]));
  }, [rubric]);

  function updateScore(category: string, updates: Partial<ScoreState>) {
    setScores((currentScores) =>
      currentScores.map((score) =>
        score.category === category ? { ...score, ...updates } : score
      )
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/observations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          title,
          subject,
          gradeLevel,
          scheduledAt,
          status,
          summary,
          feedback,
          scores,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        redirectPath?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Observation could not be created.");
        return;
      }

      router.push(result.redirectPath ?? "/dashboard/school");
      router.refresh();
    });
  }

  if (!teachers.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="font-semibold text-white">No teachers available</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Add or seed teachers for this school before creating observations.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="font-semibold text-white">Observation details</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Teacher</span>
            <select
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.title ?? teacher.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Report status
            </span>
            <select
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "SCHEDULED" | "FINALIZED")
              }
            >
              <option value="FINALIZED">Finalize report now</option>
              <option value="SCHEDULED">Schedule only</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Title</span>
            <input
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Subject</span>
            <input
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Grade</span>
            <input
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Observation date
            </span>
            <input
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
              type="date"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="font-semibold text-white">Evaluation scores</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Score each category from 1 to 5. Notes are optional but useful for the
          teacher report.
        </p>

        <div className="mt-5 grid gap-4">
          {scores.map((score) => {
            const rubricItem = rubricByCategory.get(score.category);

            return (
              <div
                key={score.category}
                className="rounded-md border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div>
                    <p className="font-medium text-white">{rubricItem?.label}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {rubricItem?.description}
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Score
                    </span>
                    <select
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
                      value={score.score}
                      onChange={(event) =>
                        updateScore(score.category, {
                          score: Number(event.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-sm font-medium text-slate-200">Note</span>
                  <input
                    className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
                    value={score.note}
                    onChange={(event) =>
                      updateScore(score.category, { note: event.target.value })
                    }
                    placeholder="Optional evidence note"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="font-semibold text-white">Summary and feedback</h2>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-200">
            Observation summary
          </span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-200">
            Written feedback
          </span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-50 outline-none transition focus:border-cyan-300"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
        </label>
      </section>

      {error ? (
        <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-md bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Creating observation..." : "Create observation report"}
        </button>
      </div>
    </form>
  );
}
