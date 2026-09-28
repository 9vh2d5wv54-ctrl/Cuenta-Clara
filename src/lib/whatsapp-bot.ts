import { answerQuestion, readQuickLog, type QuickLogInput } from "./ai";
import { formatUSD } from "./money";
import { ASK_DAILY_LIMIT } from "./plan";
import { cleanEntries, MAX_TEXT, parseTextSimple, type ParsedEntry, type QuickOptions } from "./quick-log";
import { loadUserMonth, monthInput, monthTotals } from "./server-budget";
import { supabaseAdmin } from "./supabase-server";
import { downloadMedia, sendText, type IncomingMessage } from "./whatsapp";
import { appUrl } from "./email";
import es from "../../messages/es.json";
import en from "../../messages/en.json";

// The WhatsApp assistant (Plus). Someone connects their number from Settings by
// sending "CLARA 123456"; after that they can text an expense, send a receipt
// photo, ask "¿Me alcanza…?", check "saldo", or "borrar" the last thing logged.
// Every reply is free-form text inside the 24-hour window their message opens.

type Db = ReturnType<typeof supabaseAdmin>;
type Lang = "es" | "en";
type User = { id: string; language: Lang; timezone: string; whatsapp_last_entries: string[] | null };

const LINK = /\bclara\s*(\d{6})\b/i;
const HELP = /^(ayuda|help|hola|hi|hello|menu|menú|\?)$/i;
const BALANCE = /^(saldo|balance|cuanto me queda|cuánto me queda|que me queda|qué me queda|how much is left|what's left|whats left)\??$/i;
const UNDO = /^(borrar|borra|deshacer|undo|delete)$/i;
const QUESTION = /[?¿]|^(me alcanza|alcanza|puedo|can i|should i|do i have)\b/i;

const say = {
  help: {
    es: [
      "Soy Cuenta Clara. Escríbeme:",
      "• \"Gasté 25 en gasolina\" para anotar un gasto",
      "• \"Le mandé 200 a mi mamá\" para anotar un envío",
      "• Una foto de un recibo",
      "• \"Saldo\" para ver cuánto te queda",
      "• \"¿Me alcanza para unos tenis de $80?\"",
      "• \"Borrar\" para deshacer lo último",
    ].join("\n"),
    en: [
      "I'm Cuenta Clara. Text me:",
      "• \"Spent 25 on gas\" to log an expense",
      "• \"Sent 200 to my mom\" to log a send",
      "• A photo of a receipt",
      "• \"Balance\" to see what's left",
      "• \"Can I afford $80 sneakers?\"",
      "• \"Undo\" to remove the last thing logged",
    ].join("\n"),
  },
  notLinked: `Este número no está conectado a Cuenta Clara. Conéctalo en ${appUrl("/app/ajustes")}\n\nThis number isn't connected to Cuenta Clara. Connect it in Settings: ${appUrl("/app/ajustes")}`,
  badCode: {
    es: "Ese código no funciona o ya venció. Pide uno nuevo en Ajustes → WhatsApp.",
    en: "That code doesn't work or has expired. Get a new one in Settings → WhatsApp.",
  },
  linked: { es: "Listo, tu WhatsApp está conectado.", en: "Done, your WhatsApp is connected." },
  plus: {
    es: `El asistente de WhatsApp es parte de Cuenta Clara Plus: ${appUrl("/app/plus")}`,
    en: `The WhatsApp assistant is part of Cuenta Clara Plus: ${appUrl("/app/plus")}`,
  },
  nothing: {
    es: "No encontré una cantidad. Prueba \"Gasté 25 en gasolina\" o escribe \"ayuda\".",
    en: "I couldn't find an amount. Try \"Spent 25 on gas\" or text \"help\".",
  },
  photoFail: {
    es: "No pude leer esa foto. Prueba con una más clara o escríbelo, como \"Gasté 25 en el súper\".",
    en: "I couldn't read that photo. Try a clearer one or type it, like \"Spent 25 on groceries\".",
  },
  nothingToUndo: { es: "No hay nada reciente para borrar.", en: "There's nothing recent to undo." },
  undone: { es: "Borrado.", en: "Removed." },
  limit: {
    es: `Llegaste a las ${ASK_DAILY_LIMIT} preguntas de hoy. Mañana puedes hacer más.`,
    en: `You've reached today's ${ASK_DAILY_LIMIT} questions. You can ask more tomorrow.`,
  },
  error: { es: "Algo salió mal. Intenta otra vez en un momento.", en: "Something went wrong. Try again in a moment." },
};

function left(lang: Lang, cents: number): string {
  if (cents >= 0) return lang === "es" ? `Te quedan ${formatUSD(cents)} este mes.` : `You have ${formatUSD(cents)} left this month.`;
  return lang === "es"
    ? `Este mes vas ${formatUSD(-cents)} por encima de lo que entra.`
    : `This month you're ${formatUSD(-cents)} over what comes in.`;
}

function todayIn(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function describe(lang: Lang, e: ParsedEntry, names: Map<string, string>): string {
  const m = lang === "es" ? es : en;
  const kind = { expense: m.add.typeExpense, send: m.add.typeSend, bill_paid: m.add.typeBill, savings: m.add.typeSavings, income: m.add.typeIncome }[e.type];
  const what =
    e.type === "expense"
      ? (m.add.categories as Record<string, string>)[e.category] ?? e.category
      : (e.match_id && names.get(e.match_id)) || e.note || "";
  return `${kind}${what ? ` · ${what}` : ""}: ${formatUSD(e.amount_cents)}`;
}

/** Handles one incoming WhatsApp message and replies. Never throws. */
export async function handleWhatsApp(msg: IncomingMessage): Promise<void> {
  try {
    const db = supabaseAdmin();
    // Meta can deliver the same message twice; handle it once.
    const seen = await db.from("whatsapp_messages").insert({ id: msg.id });
    if (seen.error) return;

    const text = (msg.text?.body ?? msg.image?.caption ?? "").trim().slice(0, MAX_TEXT);
    const code = text.match(LINK)?.[1];
    if (code) return await link(db, msg.from, code);

    const { data: user } = await db
      .from("users")
      .select("id, language, timezone, whatsapp_last_entries")
      .eq("whatsapp_phone", msg.from)
      .maybeSingle<User>();
    if (!user) return void (await sendText(msg.from, say.notLinked));
    const lang: Lang = user.language === "en" ? "en" : "es";

    const { data: plus } = await db.rpc("has_plus", { uid: user.id });
    if (!plus) return void (await sendText(msg.from, say.plus[lang]));

    const today = todayIn(user.timezone);
    const month = today.slice(0, 7);

    if (msg.type === "image" && msg.image?.id) {
      const photo = await downloadMedia(msg.image.id);
      const mediaType = ["image/jpeg", "image/png", "image/webp"].find((t) => t === photo?.mediaType) as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | undefined;
      if (!photo || !mediaType) return void (await sendText(msg.from, say.photoFail[lang]));
      return await log(db, user, lang, msg.from, { kind: "image", mediaType, data: photo.data }, today, month);
    }
    if (!text) return void (await sendText(msg.from, say.help[lang]));
    if (HELP.test(text)) return void (await sendText(msg.from, say.help[lang]));
    if (BALANCE.test(text.replace(/^¿/, ""))) {
      const totals = monthTotals(await loadUserMonth(db, user.id, month));
      return void (await sendText(msg.from, left(lang, totals.left)));
    }
    if (UNDO.test(text)) return await undo(db, user, lang, msg.from, month);
    if (QUESTION.test(text)) return await ask(db, user, lang, msg.from, text, month);
    return await log(db, user, lang, msg.from, { kind: "text", text }, today, month);
  } catch (err) {
    console.error("whatsapp handler error", err);
    await sendText(msg.from, `${say.error.es}\n\n${say.error.en}`).catch(() => {});
  }
}

async function link(db: Db, phone: string, code: string) {
  const { data: user } = await db
    .from("users")
    .select("id, language")
    .eq("whatsapp_code", code)
    .gt("whatsapp_code_expires", new Date().toISOString())
    .maybeSingle<{ id: string; language: Lang }>();
  if (!user) return void (await sendText(phone, `${say.badCode.es}\n\n${say.badCode.en}`));
  // One account per number: a number linked elsewhere moves to this account.
  await db.from("users").update({ whatsapp_phone: null, whatsapp_last_entries: null }).eq("whatsapp_phone", phone);
  await db
    .from("users")
    .update({ whatsapp_phone: phone, whatsapp_code: null, whatsapp_code_expires: null })
    .eq("id", user.id);
  const lang: Lang = user.language === "en" ? "en" : "es";
  await sendText(phone, `${say.linked[lang]}\n\n${say.help[lang]}`);
}

async function log(db: Db, user: User, lang: Lang, phone: string, input: QuickLogInput, today: string, month: string) {
  const u = await loadUserMonth(db, user.id, month);
  const opts: QuickOptions = {
    recipients: u.recipients.map((r) => ({ id: r.id, name: r.name })),
    bills: u.bills.map((b) => ({ id: b.id, name: b.name })),
    goals: u.goals.map((g) => ({ id: g.id, name: g.name })),
  };
  const fromClaude = await readQuickLog(input, opts, today);
  const entries = fromClaude
    ? cleanEntries(fromClaude, opts, today)
    : input.kind === "text"
      ? parseTextSimple(input.text, opts, today)
      : null;
  if (entries === null) return void (await sendText(phone, say.photoFail[lang]));
  if (entries.length === 0) return void (await sendText(phone, input.kind === "image" ? say.photoFail[lang] : say.nothing[lang]));

  const { data: saved, error } = await db
    .from("entries")
    .insert(
      entries.map((e) => ({
        user_id: user.id,
        type: e.type,
        amount_cents: e.amount_cents,
        category: e.category,
        recipient_id: e.type === "send" ? e.match_id : null,
        date: e.date,
        note: e.note,
      })),
    )
    .select("id");
  if (error) throw new Error(error.message);
  for (const e of entries) {
    if (e.type !== "savings" || !e.match_id) continue;
    const goal = u.goals.find((g) => g.id === e.match_id);
    if (goal) await db.from("goals").update({ saved_cents: goal.saved_cents + e.amount_cents }).eq("id", goal.id);
  }
  await db.from("users").update({ whatsapp_last_entries: (saved ?? []).map((s) => s.id) }).eq("id", user.id);

  const names = new Map<string, string>([...u.recipients, ...u.bills, ...u.goals].map((x) => [x.id, x.name]));
  const totals = monthTotals(await loadUserMonth(db, user.id, month));
  const lines = entries.map((e) => `✓ ${describe(lang, e, names)}`);
  const tail = lang === "es" ? "Escribe \"borrar\" para deshacer." : "Text \"undo\" to remove it.";
  await sendText(phone, [lang === "es" ? "Anotado:" : "Logged:", ...lines, "", left(lang, totals.left), tail].join("\n"));
}

async function undo(db: Db, user: User, lang: Lang, phone: string, month: string) {
  const ids = user.whatsapp_last_entries ?? [];
  if (ids.length === 0) return void (await sendText(phone, say.nothingToUndo[lang]));
  const { data: rows } = await db.from("entries").select("id, type, amount_cents, note").in("id", ids).eq("user_id", user.id);
  // Take savings back off their goal.
  const { data: goals } = await db.from("goals").select("id, name, saved_cents").eq("user_id", user.id);
  for (const r of rows ?? []) {
    if (r.type !== "savings") continue;
    const goal = (goals ?? []).find((g) => g.name === r.note);
    if (goal) await db.from("goals").update({ saved_cents: Math.max(0, goal.saved_cents - r.amount_cents) }).eq("id", goal.id);
  }
  await db.from("entries").delete().in("id", ids).eq("user_id", user.id);
  await db.from("users").update({ whatsapp_last_entries: null }).eq("id", user.id);
  const totals = monthTotals(await loadUserMonth(db, user.id, month));
  await sendText(phone, `${say.undone[lang]} ${left(lang, totals.left)}`);
}

async function ask(db: Db, user: User, lang: Lang, phone: string, question: string, month: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db
    .from("ai_questions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", today);
  if ((count ?? 0) >= ASK_DAILY_LIMIT) return void (await sendText(phone, say.limit[lang]));
  const input = monthInput(await loadUserMonth(db, user.id, month), lang, month);
  const answer = await answerQuestion(question, input);
  await db.from("ai_questions").insert({ user_id: user.id, date: today, question, answer });
  await sendText(phone, answer);
}
