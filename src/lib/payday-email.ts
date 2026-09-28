import type { EmailBody } from "./email";
import { formatUSD } from "./money";
import type { PaydayPlan } from "./payday-plan";

// The payday email's words. Every number comes from the plan (lib/payday-plan.ts);
// Clara only writes the first line.

function day(iso: string, lang: "es" | "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", day: "numeric", month: "long" });
}

/** Facts for Clara's opening line: already-formatted numbers only. */
export function paydayFacts(p: PaydayPlan, lang: "es" | "en"): string {
  return [
    `Language: ${lang === "es" ? "Spanish" : "English"}`,
    `Payday: tomorrow`,
    `Expected paycheck: ${formatUSD(p.paycheck)}`,
    ...(p.onHand !== null ? [`In the bank now: ${formatUSD(p.onHand)}`] : []),
    `Bills due before the next payday: ${p.bills.length ? p.bills.map((b) => `${b.name} ${formatUSD(b.amount)}`).join(", ") : "none"}`,
    `Left for everyday spending until the next payday (already calculated): ${formatUSD(p.left)}`,
    `Days until the next payday: ${p.days}`,
    ...(p.bills.length === 0 && p.billsTotal === 0 && p.family === 0 && p.savings === 0
      ? ["Nothing planned yet: no bills, sends or savings entered. Don't call the number a plan; keep it short."]
      : []),
  ].join("\n");
}

export function paydayFallbackLine(p: PaydayPlan, lang: "es" | "en"): string {
  if (p.bills.length === 0 && p.billsTotal === 0 && p.family === 0 && p.savings === 0) {
    return lang === "es" ? "Mañana te pagan. Vamos a darle un plan a ese dinero." : "You get paid tomorrow. Let's give that money a plan.";
  }
  if (p.left < 0) {
    return lang === "es"
      ? "Mañana te pagan. No alcanza para todo lo que viene, así que primero van las cuentas."
      : "You get paid tomorrow. It won't cover everything coming up, so bills go first.";
  }
  return lang === "es"
    ? `Mañana te pagan, y ya hay un plan: te quedarían ${formatUSD(p.left)} para el día a día.`
    : `You get paid tomorrow, and there's already a plan: about ${formatUSD(p.left)} left for everyday spending.`;
}

export function paydayEmail(p: PaydayPlan, lang: "es" | "en", line: string, url: string): { subject: string; body: EmailBody } {
  const es = lang === "es";
  const lines: string[] = [];
  const dueList = p.bills.map((b) => `${b.name} ${es ? "el" : "on"} ${day(b.date, lang)}`).join(", ");
  if (p.mode === "due") {
    for (const b of p.bills) lines.push(`• ${b.name}: ${formatUSD(b.amount)} (${es ? "vence el" : "due"} ${day(b.date, lang)})`);
  } else if (p.billsTotal > 0) {
    lines.push(
      es
        ? `• Aparta para tus cuentas: ${formatUSD(p.billsTotal)}${dueList ? ` (vienen: ${dueList})` : ""}`
        : `• Set aside for bills: ${formatUSD(p.billsTotal)}${dueList ? ` (coming up: ${dueList})` : ""}`,
    );
  }
  if (p.family > 0) lines.push(`• ${es ? "Envíos a tu familia" : "Family sends"}: ${formatUSD(p.family)}`);
  if (p.savings > 0) lines.push(`• ${es ? "Ahorro para tus metas" : "Savings for your goals"}: ${formatUSD(p.savings)}`);
  if (p.taxes > 0) lines.push(`• ${es ? "Aparte para impuestos" : "Set aside for taxes"}: ${formatUSD(p.taxes)}`);

  const empty = lines.length === 0;
  const intro = empty
    ? es
      ? `Tu pago de unos ${formatUSD(p.paycheck)} llega mañana. Todavía no tienes cuentas, envíos ni ahorro en tu plan, así que este número es solo un comienzo: agrégalos en la app para que sea real.`
      : `Your paycheck of about ${formatUSD(p.paycheck)} arrives tomorrow. There are no bills, sends or savings in your plan yet, so this number is just a start: add them in the app to make it real.`
    : p.onHand !== null
      ? es
        ? `Con lo que tienes en el banco (${formatUSD(p.onHand)}) más tu pago de unos ${formatUSD(p.paycheck)}, esto es lo que va antes del próximo pago:`
        : `With what's in the bank (${formatUSD(p.onHand)}) plus your paycheck of about ${formatUSD(p.paycheck)}, here's what comes before the next payday:`
      : es
        ? `Cuando llegue tu pago de unos ${formatUSD(p.paycheck)}:`
        : `When your paycheck of about ${formatUSD(p.paycheck)} arrives:`;
  const until = day(p.nextPayday, lang);
  const leftLine =
    p.left >= 0
      ? es
        ? `Te quedarían ${formatUSD(p.left)} para el día a día hasta el ${until}${p.perDay ? `, unos ${formatUSD(p.perDay)} al día` : ""}.`
        : `That leaves ${formatUSD(p.left)} for everyday spending until ${until}${p.perDay ? `, about ${formatUSD(p.perDay)} a day` : ""}.`
      : es
        ? `Te faltarían ${formatUSD(-p.left)} para cubrir todo hasta el ${until}. Paga primero lo que vence y deja los extras para después.`
        : `You'd be ${formatUSD(-p.left)} short of covering everything until ${until}. Pay what's due first and hold off on extras.`;

  return {
    subject: es ? "Mañana es día de pago: tu plan" : "Payday tomorrow: here's your plan",
    body: {
      lang,
      paragraphs: [
        line,
        intro,
        ...lines,
        leftLine,
      ],
      button: { label: es ? "Ver mi plan" : "See my plan", url },
      footnote: es
        ? "Es un estimado con tus números. ¿Tienes una pregunta? Pregúntale a Clara en la app."
        : "An estimate from your numbers. Have a question? Ask Clara in the app.",
    },
  };
}
