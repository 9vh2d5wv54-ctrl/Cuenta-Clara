import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabase-env";

export const isDemo = !SUPABASE_URL || !SUPABASE_PUBLIC_KEY;
