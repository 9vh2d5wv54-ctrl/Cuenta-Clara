"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CtaLink } from "./CtaLink";

/** Phone-only bar that appears once the hero button has scrolled out of view. */
export function StickyCta({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only once it has left through the top, not before the visitor reaches it.
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div className="sticky-cta" data-show={show} aria-hidden={!show}>
      <CtaLink placement="sticky" className="btn btn--primary btn--cta btn--block">
        {children}
      </CtaLink>
    </div>
  );
}
