"use client";

// Logout needs a client component because it sends a browser request and then
// navigates the user back to the login page.

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // After the cookie is deleted, refresh clears protected server state.
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleLogout}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
