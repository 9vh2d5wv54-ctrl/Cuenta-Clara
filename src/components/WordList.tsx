"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Input } from "./ui";

type Item = { id: string; href?: string; term: string; def: string; example?: string; otherTerm: string };

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Searchable word list. Matches the term in either language and the definition. */
export function WordList({
  words,
  labels,
}: {
  words: Item[];
  labels: { search: string; none: string; more: string; count: string };
}) {
  const [q, setQ] = useState("");
  const query = fold(q.trim());
  // Words whose name matches come first, then words that mention it.
  const byName = words.filter((w) => fold(`${w.term} ${w.otherTerm}`).includes(query));
  const shown = query
    ? [...byName, ...words.filter((w) => !byName.includes(w) && fold(w.def).includes(query))]
    : words;

  return (
    <>
      <div className="stack-sm">
        <Input
          type="search"
          aria-label={labels.search}
          placeholder={labels.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="t-caption muted">{labels.count.replace("{n}", String(shown.length))}</p>
      </div>
      {shown.length === 0 && <p className="t-body muted">{labels.none}</p>}
      <div className="stack-sm">
        {shown.map((w) => (
          <Card key={w.id}>
            <article id={w.id} className="stack-sm">
              <h2 className="t-heading">{w.term}</h2>
              {w.otherTerm !== w.term && <p className="t-caption muted">{w.otherTerm}</p>}
              <p className="t-body">{w.def}</p>
              {w.example && <p className="notice t-caption">{w.example}</p>}
              {w.href && (
                <Link href={w.href} className="t-label">
                  {labels.more} →
                </Link>
              )}
            </article>
          </Card>
        ))}
      </div>
    </>
  );
}
