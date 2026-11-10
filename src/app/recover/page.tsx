"use client";
// Identical feedback for all emails prevents account enumeration.
import { useState } from "react";
export default function RecoveryPage() {
  const [message, setMessage] = useState("");
  return <main className="mx-auto max-w-md p-8"><h1 className="text-2xl">Recover account</h1>
    <form onSubmit={async event => {
      event.preventDefault();
      const email = new FormData(event.currentTarget).get("email");
      await fetch("/api/auth/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
      setMessage("If an account exists, a recovery email will arrive shortly.");
    }}><label>Email<input className="block border p-2" name="email" type="email" required /></label>
      <button className="my-4 rounded bg-brand-coral p-3 text-white">Send recovery link</button></form><p role="status">{message}</p></main>;
}
