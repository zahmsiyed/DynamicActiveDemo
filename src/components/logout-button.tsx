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
      className="rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-coral hover:text-brand-coral disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleLogout}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
