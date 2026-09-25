import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, supabaseSecretKey } from "./supabase-env";

/** Acts as the signed-in user, from their session cookie. */
export async function supabaseFromCookies() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a place that can't set cookies; the session still reads fine.
        }
      },
    },
  });
}

/** Bypasses row-level security. Server-only: webhooks and cron. */
export function supabaseAdmin() {
  return createClient(SUPABASE_URL, supabaseSecretKey(), {
    auth: { persistSession: false },
  });
}
