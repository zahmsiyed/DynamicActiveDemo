"use client";

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

const panelClass =
  "rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm";
const inputClass =
  "mt-2 w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-brand-ink outline-none transition focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10";
const labelClass = "text-sm font-semibold text-brand-ink";

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
      <div className={panelClass}>
        <h2 className="font-semibold text-brand-ink">No teachers available</h2>
        <p className="mt-2 text-sm leading-6 text-brand-muted">
          Add or seed teachers for this school before creating observations.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <section className={panelClass}>
        <h2 className="font-semibold text-brand-ink">Observation details</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Teacher</span>
            <select
              className={inputClass}
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
            <span className={labelClass}>Report status</span>
            <select
              className={inputClass}
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
            <span className={labelClass}>Title</span>
            <input
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Subject</span>
            <input
              className={inputClass}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Grade</span>
            <input
              className={inputClass}
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Observation date</span>
            <input
              className={inputClass}
              type="date"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={panelClass}>
        <h2 className="font-semibold text-brand-ink">Evaluation scores</h2>
        <p className="mt-2 text-sm leading-6 text-brand-muted">
          Score each category from 1 to 5. Notes are optional but useful for the
          teacher report.
        </p>

        <div className="mt-5 grid gap-4">
          {scores.map((score) => {
            const rubricItem = rubricByCategory.get(score.category);

            return (
              <div
                key={score.category}
                className="rounded-[1.25rem] border border-brand-line bg-white p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div>
                    <p className="font-semibold text-brand-ink">
                      {rubricItem?.label}
                    </p>
                    <p className="mt-1 text-sm text-brand-muted">
                      {rubricItem?.description}
                    </p>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Score</span>
                    <select
                      className={inputClass}
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
                  <span className={labelClass}>Note</span>
                  <input
                    className={inputClass}
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

      <section className={panelClass}>
        <h2 className="font-semibold text-brand-ink">Summary and feedback</h2>

        <label className="mt-4 block">
          <span className={labelClass}>Observation summary</span>
          <textarea
            className={`${inputClass} min-h-28`}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>

        <label className="mt-4 block">
          <span className={labelClass}>Written feedback</span>
          <textarea
            className={`${inputClass} min-h-32`}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
        </label>
      </section>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-brand-coral px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Creating observation..." : "Create observation report"}
        </button>
      </div>
    </form>
  );
}
