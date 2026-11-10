"use client";
// Both forms rely on server authorization; hidden controls never grant access.
import { useState } from "react";
export function DistrictSettings({
  schools,
}: {
  schools: { id: string; name: string }[];
}) {
  const [message, setMessage] = useState("");
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    path: string,
    numeric: boolean,
  ) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = numeric
      ? Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, Number(v)]),
        )
      : values;
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      setMessage(
        response.ok ? "Saved successfully." : result.error || "Unable to save.",
      );
    } catch {
      setMessage("Unable to reach the server.");
    }
  }
  return (
    <div className="grid gap-8">
      <form
        className="grid gap-3"
        onSubmit={(e) => submit(e, "/api/admin/invitations", false)}
      >
        <h2 className="text-xl">Invite a colleague</h2>
        <label>
          Name
          <input name="name" required className="ml-2 border p-2" />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            className="ml-2 border p-2"
          />
        </label>
        <label>
          Role
          <select name="role" className="ml-2 border p-2">
            <option value="TEACHER">Teacher</option>
            <option value="SCHOOL_ADMIN">School admin</option>
          </select>
        </label>
        <label>
          School
          <select name="schoolId" className="ml-2 border p-2">
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-brand-coral p-3 text-white">
          Send invitation
        </button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={(e) => submit(e, "/api/admin/policy", true)}
      >
        <h2 className="text-xl">Retention policy</h2>
        <p>
          Choose how many days each data type is retained. Shortening a policy
          can expire existing data at the next maintenance run.
        </p>
        {[
          ["recordingRetentionDays", "Recordings"],
          ["transcriptRetentionDays", "Transcripts"],
          ["reportRetentionDays", "Reports"],
        ].map(([name, label]) => (
          <label key={name}>
            {label} (days)
            <input
              className="ml-2 border p-2"
              name={name}
              type="number"
              min={1}
              max={3650}
              required
            />
          </label>
        ))}
        <button className="rounded bg-brand-coral p-3 text-white">
          Save retention policy
        </button>
      </form>
      <p role="status">{message}</p>
    </div>
  );
}
