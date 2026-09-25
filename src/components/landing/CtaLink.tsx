"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { trackCtaClick } from "@/lib/analytics";

/** Every CTA goes to signup with the visitor's language carried over. */
export function CtaLink({
  placement,
  className = "btn btn--primary btn--cta",
  id,
  children,
}: {
  placement: string;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  return (
    <Link
      id={id}
      href={`/login?mode=signup&lang=${locale}`}
      className={className}
      onClick={() => trackCtaClick(placement)}
    >
      {children}
    </Link>
  );
}
