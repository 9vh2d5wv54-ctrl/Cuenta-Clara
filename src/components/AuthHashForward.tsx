"use client";

import { useEffect } from "react";

// When Supabase can't use our redirect, the login link lands on the home page
// with the session in the URL hash. Hand it to the app, which signs you in.
export function AuthHashForward() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token=")) window.location.replace(`/app${hash}`);
    else if (hash.includes("error=")) window.location.replace("/login?error=link");
  }, []);
  return null;
}
