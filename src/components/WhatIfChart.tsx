"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatShortDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import type { WhatIfChart as Chart } from "@/lib/what-if";
import { PlusPreview } from "./Plus";
import { Segmented } from "./ui";

// "What if?" (Plus): the bank balance day by day, as planned vs. with the decision.
// Two 2px lines on one axis, a legend with line keys, a crosshair tooltip with
// every value at that day, and a table view so nothing depends on hovering.

const W = 320;
const H = 168;
const PAD = { top: 10, right: 10, bottom: 22, left: 48 };
const RANGES = ["30", "60", "90"] as const;

function niceStep(span: number, target: number): number {
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function compact(cents: number): string {
  const d = cents / 100;
  const abs = Math.abs(d);
  const sign = d < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function WhatIfChart({ chart, locked }: { chart: Chart; locked: boolean }) {
  const t = useTranslations("whatIf");
  const body = <ChartBody chart={chart} />;
  return (
    <div className="whatif">
      {locked ? (
        <PlusPreview feature="clara" label={t("locked")}>
          {body}
        </PlusPreview>
      ) : (
        body
      )}
    </div>
  );
}

function ChartBody({ chart }: { chart: Chart }) {
  const t = useTranslations("whatIf");
  const locale = useLocale();
  const id = useId();
  const [range, setRange] = useState<(typeof RANGES)[number]>(String(chart.defaultRange) as (typeof RANGES)[number]);
  const [hover, setHover] = useState<number | null>(null);

  const days = chart.days.slice(0, Number(range) + 1);
  const values = days.flatMap((d) => [d.planned, d.withIt]);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo > 0 && lo < hi * 0.25) lo = 0; // show the floor when the balance gets close to it
  if (hi === lo) hi = lo + 10_000;
  const step = niceStep(hi - lo, 3);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1; v += step) ticks.push(v);

  const x = (i: number) => PAD.left + (i / (days.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const path = (k: "planned" | "withIt") => days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const last = days.length - 1;
  const same = days.every((d) => d.planned === d.withIt);
  const name = chart.label.trim();
  const withLabel = t("withIt", { label: name && name.length <= 24 && !/unspecified|sin especificar/i.test(name) ? name : t("decision") });

  function pick(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * last);
    setHover(Math.max(0, Math.min(last, i)));
  }
  function keys(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cur = hover ?? 0;
    setHover(Math.max(0, Math.min(last, cur + (e.key === "ArrowRight" ? 1 : -1))));
  }

  const h = hover === null ? null : days[hover];
  const weekly = days.filter((_, i) => i % 7 === 0 || i === last);

  return (
    <div className="stack-sm">
      <div className="row row--between whatif__head">
        <p className="t-label">{t("title")}</p>
        <Segmented label={t("range")} value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: t("days", { n: r }) }))} />
      </div>
      <ul className="whatif__legend t-caption">
        <li>
          <span className="whatif__key whatif__key--planned" aria-hidden />
          {t("planned")} · <strong className="num">{formatUSD(days[last].planned)}</strong>
        </li>
        {!same && (
          <li>
            <span className="whatif__key whatif__key--with" aria-hidden />
            {withLabel} · <strong className="num">{formatUSD(days[last].withIt)}</strong>
          </li>
        )}
      </ul>
      <div className="whatif__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${id}-desc`}
          tabIndex={0}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setHover(null)}
          onKeyDown={keys}
          onBlur={() => setHover(null)}
        >
          <desc id={`${id}-desc`}>
            {t("describe", {
              days: range,
              planned: formatUSD(days[last].planned),
              withIt: formatUSD(days[last].withIt),
              label: withLabel,
            })}
          </desc>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? "whatif__zero" : "whatif__grid"} />
              <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="whatif__tick">
                {compact(v)}
              </text>
            </g>
          ))}
          {[0, Math.round(last / 2), last].map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} className="whatif__tick">
              {i === 0 ? t("today") : formatShortDate(days[i].date, locale)}
            </text>
          ))}
          <path d={path("planned")} className="whatif__line whatif__line--planned" />
          {!same && <path d={path("withIt")} className="whatif__line whatif__line--with" />}
          <circle cx={x(last)} cy={y(days[last].planned)} r={4} className="whatif__dot whatif__dot--planned" />
          {!same && <circle cx={x(last)} cy={y(days[last].withIt)} r={4} className="whatif__dot whatif__dot--with" />}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="whatif__cross" />
              <circle cx={x(hover)} cy={y(h.planned)} r={4} className="whatif__dot whatif__dot--planned" />
              {!same && <circle cx={x(hover)} cy={y(h.withIt)} r={4} className="whatif__dot whatif__dot--with" />}
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div className="whatif__tip t-caption" style={{ left: `clamp(72px, ${(x(hover) / W) * 100}%, calc(100% - 72px))` }} role="status">
            <p className="whatif__tip-date">{hover === 0 ? t("today") : formatShortDate(h.date, locale)}</p>
            <p>
              <span className="whatif__key whatif__key--planned" aria-hidden />
              <strong className="num">{formatUSD(h.planned)}</strong> {t("planned")}
            </p>
            {!same && (
              <p>
                <span className="whatif__key whatif__key--with" aria-hidden />
                <strong className="num">{formatUSD(h.withIt)}</strong> {withLabel}
              </p>
            )}
            {h.payday && <p className="muted">{t("payday")}</p>}
            {h.bills.map((b) => (
              <p key={b.name} className="muted">
                {b.name} −{formatUSD(b.amount)}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="whatif__table t-caption">
        <summary>{t("table")}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t("date")}</th>
              <th scope="col">{t("planned")}</th>
              {!same && <th scope="col">{withLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {weekly.map((d) => (
              <tr key={d.date}>
                <td>{formatShortDate(d.date, locale)}</td>
                <td className="num">{formatUSD(d.planned)}</td>
                {!same && <td className="num">{formatUSD(d.withIt)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="t-caption muted">{t("assumes")}</p>
    </div>
  );
}
