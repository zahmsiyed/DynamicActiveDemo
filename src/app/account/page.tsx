"use client";
// Invitation and recovery links establish a session before opening this form.
import { useState } from "react";
export default function AccountPage() {
  const [message, setMessage] = useState("");
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl">Set your password</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const password = new FormData(event.currentTarget).get("password");
          const response = await fetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          setMessage(
            response.ok
              ? "Password saved. You can open your dashboard."
              : "Password could not be saved. Open a fresh invitation or recovery link.",
          );
        }}
      >
        <label>
          Password (at least 12 characters)
          <input
            className="block border p-2"
            name="password"
            type="password"
            minLength={12}
            required
          />
        </label>
        <button className="my-4 rounded bg-brand-coral p-3 text-white">
          Save password
        </button>
      </form>
      <p role="status">{message}</p>
      <a href="/dashboard">Open dashboard</a>
    </main>
  );
}
