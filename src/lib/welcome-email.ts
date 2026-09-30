import type { EmailBody } from "./email";

// The next-day nudge for people who signed up but didn't finish setup. Sent once:
// the daily job only looks at sign-ups from 24 to 48 hours ago, and it runs once a day.

const HOUR = 3_600_000;

/** The sign-up window the daily job checks: from 48 up to (not including) 24 hours ago. */
export function nudgeWindow(now = new Date()): { from: string; to: string } {
  return { from: new Date(now.getTime() - 48 * HOUR).toISOString(), to: new Date(now.getTime() - 24 * HOUR).toISOString() };
}

/** Who gets the nudge: signed up in the window, still hasn't set up income or a bill. */
export function needsNudge(user: { id: string; created_at: string }, setUp: Set<string>, now = new Date()): boolean {
  const { from, to } = nudgeWindow(now);
  return user.created_at >= from && user.created_at < to && !setUp.has(user.id);
}

export function welcomeEmail(lang: "es" | "en", setupUrl: string): { subject: string; body: EmailBody } {
  if (lang === "es") {
    return {
      subject: "Te falta un minuto para ver cuánto puedes gastar",
      body: {
        lang,
        paragraphs: [
          "Hola, gracias por unirte a Pocket Recon.",
          "Vi que todavía no terminaste de configurar tu cuenta. Son 5 preguntas cortas: cada cuánto te pagan, cuánto es tu cheque, cuándo te pagan, tu cuenta más grande y cuánto tienes hoy.",
          "Con eso te mostramos cuánto puedes gastar hasta tu próximo pago, después de tus cuentas. Nunca nos conectamos a tu banco.",
          "Si algo no quedó claro, responde este correo. Lo leo yo.",
          "Manny, fundador de Pocket Recon",
        ],
        button: { label: "Terminar en 1 minuto", url: setupUrl },
      },
    };
  }
  return {
    subject: "One minute to see what's safe to spend",
    body: {
      lang,
      paragraphs: [
        "Hi, thanks for joining Pocket Recon.",
        "I noticed you haven't finished setting up yet. It's 5 short questions: how often you're paid, how much each check is, when payday is, your biggest bill, and what's in your account today.",
        "Then we show you what's safe to spend until your next payday, after your bills. We never connect to your bank.",
        "If anything was confusing, just reply to this email. I read every one.",
        "Manny, founder of Pocket Recon",
      ],
      button: { label: "Finish in 1 minute", url: setupUrl },
    },
  };
}
