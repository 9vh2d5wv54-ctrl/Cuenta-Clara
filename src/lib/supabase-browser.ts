import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabase-env";

export function supabaseBrowser() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
  );
}
