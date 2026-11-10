"use client";
// Scheduling collects context only. Scoring and feedback belong to review.
import { useState } from "react";
import { useRouter } from "next/navigation";
type TeacherOption = {
  id: string;
  name: string;
  email: string;
  title: string | null;
};
export function ObservationForm({ teachers }: { teachers: TeacherOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "mt-2 block w-full rounded border border-brand-line p-3";
  return (
    <form
      className="grid gap-4 rounded-3xl border bg-white p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const body = Object.fromEntries(new FormData(event.currentTarget));
          const response = await fetch("/api/observations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || "Observation could not be created.",
            );
          router.push(result.redirectPath);
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Unable to reach server.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Teacher
        <select className={input} name="teacherId" required>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input
          className={input}
          name="title"
          defaultValue="Classroom Observation"
          required
          maxLength={200}
        />
      </label>
      <label>
        Subject
        <input
          className={input}
          name="subject"
          defaultValue="Science"
          required
          maxLength={120}
        />
      </label>
      <label>
        Grade
        <input
          className={input}
          name="gradeLevel"
          defaultValue="7"
          required
          maxLength={30}
        />
      </label>
      <label>
        Observation date
        <input
          className={input}
          name="scheduledAt"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </label>
      <label>
        Observation summary
        <textarea className={input} name="summary" maxLength={10000} />
      </label>
      <p>
        Upload a recording after scheduling. Review generated suggestions before
        publishing the report.
      </p>
      <button
        className="w-fit rounded-full bg-brand-coral px-5 py-3 text-white"
        disabled={busy || !teachers.length}
      >
        {busy ? "Creating…" : "Create observation report"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
