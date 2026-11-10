// Request-local auth clients carry cookies; privileged clients never do.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        // Server Components cannot write cookies; the proxy refreshes them.
        try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Read-only render. */ }
      },
    },
  });
}

// Only server code may import this client. It bypasses Storage/Auth policies.
export function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
