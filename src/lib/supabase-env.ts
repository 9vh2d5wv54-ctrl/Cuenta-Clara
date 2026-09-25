// Supabase settings. Accepts both the classic names and the ones Supabase's
// Vercel integration may add (publishable/secret keys), so either setup works.
// NEXT_PUBLIC_* must be read with literal names so Next.js can inline them.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Server-only. */
export function supabaseSecretKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
}
