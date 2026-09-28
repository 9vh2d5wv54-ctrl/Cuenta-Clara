/** Sign-in emails in CLARA_TESTER_EMAILS (Vercel, comma-separated): Plus-level Clara and the test pages. */
export function isTester(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.CLARA_TESTER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
