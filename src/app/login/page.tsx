// The `/login` route is public.
// It renders the client-side LoginForm inside Suspense because the form reads
// URL search parameters such as ?next=/dashboard.

import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-brand-ink sm:px-8 lg:px-10">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-[1.5rem] border border-brand-line bg-brand-card p-6 text-brand-muted shadow-sm">
            Loading login...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
