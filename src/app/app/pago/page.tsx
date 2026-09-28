"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/components/Icon";
import { PlusCard } from "@/components/Plus";
import { Button, Card, Field, Input, MoneyInput, Segmented } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { centsToInput, formatUSD, parseCents } from "@/lib/money";
import { compare, expectedPay, lowOvertimeRate, OVERTIME_RATE, type StubReading } from "@/lib/paystub";
import { shrinkPhoto } from "@/lib/photo";
import { hasPlus } from "@/lib/plan";

type Period = "weekly" | "biweekly";

function hoursValue(text: string): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 168 ? n : 0;
}

// Plus: the paycheck checker. Rate × hours with federal overtime, compared with
// the stub's gross pay. The math is here; Claude only reads the photo.
export default function PayCheck() {
  const t = useTranslations("paystub");
  const router = useRouter();
  const { profile, subscription, hasCheckup, mutate } = useData();
  const [period, setPeriod] = useState<Period>(profile?.pay_frequency ?? "weekly");
  const [rate, setRate] = useState("");
  const [week1, setWeek1] = useState("");
  const [week2, setWeek2] = useState("");
  const [gross, setGross] = useState("");
  const [stub, setStub] = useState<StubReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  if (!hasPlus(subscription)) {
    return (
      <main className="page">
        <div className="stack-sm">
          <h1 className="t-title">{t("title")}</h1>
          <p className="t-body muted">{t("lead")}</p>
        </div>
        {hasCheckup ? <PlusCard feature="paystub" title={t("plusTitle")} /> : <p className="notice t-body">{t("plusLater")}</p>}
      </main>
    );
  }

  async function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await shrinkPhoto(file);
      const res = await fetch("/api/paystub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: "image/jpeg", data }),
      });
      if (res.status === 503) return setMessage(t("photosOff"));
      if (res.status === 429) return setMessage(t("limit"));
      if (!res.ok) return setMessage(t("photoError"));
      const { reading } = (await res.json()) as { reading: StubReading | null };
      if (!reading || (!reading.gross_pay && !reading.hourly_rate)) return setMessage(t("photoError"));
      setStub(reading);
      if (reading.hourly_rate) setRate(centsToInput(Math.round(reading.hourly_rate * 100)));
      if (reading.gross_pay) setGross(centsToInput(Math.round(reading.gross_pay * 100)));
      const hours = reading.regular_hours + reading.overtime_hours;
      if (hours) {
        // The stub shows the period's total; split it evenly and let them fix each week.
        const each = period === "biweekly" ? hours / 2 : hours;
        setWeek1(String(Math.round(each * 100) / 100));
        if (period === "biweekly") setWeek2(String(Math.round(each * 100) / 100));
      }
      setMessage(t("photoRead", { employer: reading.employer || "none" }));
    } catch {
      setMessage(t("photoError"));
    } finally {
      setBusy(false);
    }
  }

  const rateCents = parseCents(rate) ?? 0;
  const weeks = period === "biweekly" ? [hoursValue(week1), hoursValue(week2)] : [hoursValue(week1)];
  const expected = expectedPay(rateCents, weeks);
  const grossCents = parseCents(gross) ?? 0;
  const ready = rateCents > 0 && expected.regularHours + expected.overtimeHours > 0;
  const verdict = ready && grossCents > 0 ? compare(expected.total, grossCents) : null;
  const lowOt = stub ? lowOvertimeRate(rateCents, Math.round(stub.overtime_rate * 100)) : false;
  const netCents = stub?.net_pay ? Math.round(stub.net_pay * 100) : 0;
  const canLog = Boolean(profile?.pay_frequency) && netCents > 0;

  async function logPaycheck() {
    await mutate((s) =>
      s.addEntry({ type: "income", amount_cents: netCents, category: "income", recipient_id: null, date: todayISO(), note: stub?.employer || null }),
    );
    router.push("/app");
  }

  const fmtHours = (h: number) => (Math.round(h * 100) / 100).toString();

  return (
    <main className="page">
      <div className="stack-sm">
        <h1 className="t-title">{t("title")}</h1>
        <p className="t-body muted">{t("lead")}</p>
      </div>

      <Card tone="clara">
        <div className="stack-sm">
          <Button variant="secondary" block onClick={() => photoInput.current?.click()} disabled={busy}>
            <Icon name="camera" size={20} />
            {busy ? t("reading") : t("photo")}
          </Button>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={photo} />
          <p className="t-caption muted">{t("photoNote")}</p>
          {message && (
            <p className="notice t-caption" role="status">
              {message}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="stack">
          <div className="field">
            <span className="field__label">{t("period")}</span>
            <Segmented
              label={t("period")}
              value={period}
              onChange={setPeriod}
              options={[
                { value: "weekly", label: t("weekly") },
                { value: "biweekly", label: t("biweekly") },
              ]}
            />
          </div>
          <Field label={t("rate")}>
            {(p) => <MoneyInput {...p} value={rate} onChange={(e) => setRate(e.target.value)} />}
          </Field>
          <Field label={period === "biweekly" ? t("week1of2") : t("week1")} hint={period === "biweekly" ? t("hoursHint") : undefined}>
            {(p) => <Input {...p} inputMode="decimal" placeholder="40" value={week1} onChange={(e) => setWeek1(e.target.value)} />}
          </Field>
          {period === "biweekly" && (
            <Field label={t("week2")}>
              {(p) => <Input {...p} inputMode="decimal" placeholder="40" value={week2} onChange={(e) => setWeek2(e.target.value)} />}
            </Field>
          )}
          <Field label={t("gross")} hint={t("grossHint")}>
            {(p) => <MoneyInput {...p} value={gross} onChange={(e) => setGross(e.target.value)} />}
          </Field>
        </div>
      </Card>

      {ready && (
        <Card className="hero">
          <p className="t-label muted">{t("expectedTitle")}</p>
          <p className="t-money-xl hero__figure">{formatUSD(expected.total)}</p>
          <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "start" }}>
            <li className="list-row">
              <span className="t-body grow">
                {t("regularLine", { hours: fmtHours(expected.regularHours), rate: formatUSD(rateCents) })}
              </span>
              <span className="t-body num">{formatUSD(expected.regular)}</span>
            </li>
            {expected.overtimeHours > 0 && (
              <li className="list-row">
                <span className="t-body grow">
                  {t("overtimeLine", {
                    hours: fmtHours(expected.overtimeHours),
                    rate: formatUSD(Math.round(rateCents * OVERTIME_RATE)),
                  })}
                </span>
                <span className="t-body num">{formatUSD(expected.overtime)}</span>
              </li>
            )}
          </ul>

          {verdict && (
            <p
              className={verdict.status === "under" ? "notice notice--alerta t-body" : "notice t-body"}
              role="status"
            >
              {verdict.status === "match" && <Icon name="check" size={20} />}
              {verdict.status === "match"
                ? t("match")
                : verdict.status === "under"
                  ? t("under", { amount: formatUSD(verdict.diff) })
                  : t("over", { amount: formatUSD(verdict.diff) })}
            </p>
          )}
          {lowOt && stub && (
            <p className="notice notice--alerta t-body" role="status">
              {t("lowOvertime", {
                shown: formatUSD(Math.round(stub.overtime_rate * 100)),
                expected: formatUSD(Math.round(rateCents * OVERTIME_RATE)),
              })}
            </p>
          )}
          {(verdict?.status === "under" || lowOt) && <p className="t-body">{t("nextSteps")}</p>}
          <p className="t-caption muted">{t("rules")}</p>
          {canLog && (
            <Button block onClick={logPaycheck}>
              {t("logIt", { amount: formatUSD(netCents) })}
            </Button>
          )}
        </Card>
      )}
    </main>
  );
}
