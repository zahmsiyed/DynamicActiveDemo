// The `/login` route is public.
// It renders the client-side LoginForm inside Suspense because the form reads
// URL search parameters such as ?next=/dashboard.

import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
      <Suspense
        fallback={
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-slate-300">
            Loading login...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
