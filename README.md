# Cuenta Clara

A bilingual (Spanish/English) budgeting web app for households that manage money across two countries. It shows what's left this month after bills, savings, and what goes to family. It is not a bank and never moves money.

Built from the Cuenta Clara MVP PRD and styled with the Cuenta Clara brand kit.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys, the app runs in **demo mode**: any email signs in, and data stays in that browser's localStorage. A banner says so on every app screen.

## Connect Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor. It creates the six tables, row-level security on each, and the signup trigger.
2. In Supabase → Authentication → URL configuration, add `http://localhost:3000/auth/callback` and your production `/auth/callback` URL as redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.


## How it's built

| Part | Where |
| --- | --- |
| Brand tokens (colors light/dark, type, spacing, radius, shadow) | `src/app/tokens.css`, copied value for value from the brand kit |
| Components (Button, Card, Field, MoneyInput, ProgressBar, Segmented, Explain tooltip, Dialog, Toast) | `src/components/ui.tsx`, styled in `src/app/globals.css` |
| Copy, Spanish and English | `messages/es.json`, `messages/en.json`. No hard-coded UI text. Voice uses tú. |
| "What's left" math | `src/lib/budget.ts` |
| Data access (Supabase or demo) | `src/lib/store*.ts` |
| Exchange rates | `/api/rates`, from ExchangeRate-API open access, cached a day, credited on the Envíos screen |

Money is stored as integer cents in USD and always shown as `$1,250.00`. Home-country amounts show their own symbol, like `RD$ 12,684`.

**What's left** = income − fixed bills − planned family sends − this month's goal contributions − logged everyday expenses. Logging a send, a paid bill, or savings marks the plan as done without counting it twice. Biweekly sends count twice a month.

## Screens

| # | Route | Screen |
| --- | --- | --- |
| 1 | `/` | Landing page for ad traffic (see below) |
| 2 | `/login` | Sign up / Log in (password or magic link) |
| 3 | `/app/setup` | Setup wizard: income, bills, family sends, one goal |
| 4 | `/app` | Dashboard |
| 5 | `/app/add` | Add entry, with one-tap presets for regular sends |
| 6 | `/app/envios` | Family sends with live exchange rates |
| 7 | `/app/metas` | Savings goals |
| 8 | `/app/ajustes` | Settings |
| 9 | `/app/chequeo` | Money checkup |
| 10 | `/app/plus` | Plus (paywall) |

Language is chosen on the landing page, can be switched on every screen, and is saved to the profile.

## Landing page

Built from the Cuenta Clara Landing Page PRD: hero with before/after cards, trust strip, how it works, the big-number phone mock, family sends, FAQ, and a final CTA. A sticky "Empezar gratis" bar appears on phones once the hero button scrolls away.

- **Language from the ad:** `?lang=es` or `?lang=en` picks the language and saves it; every CTA carries it into signup.
- **No invented proof:** the trust strip holds true facts until real testers give quotes and numbers.
- **Measurement:** set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` for page views, scroll depth and `CTA click` events (tagged with placement and language), and `NEXT_PUBLIC_META_PIXEL_ID` for the Meta Pixel. Both fire a signup event when an account is created. Plausible reads `utm_source` and `utm_campaign` itself.
- **Lighthouse (mobile, local build):** performance 99, accessibility 100, best practices 100.
- **Before launch:** confirm "Hecho en Newark, NJ". The browser-tab icon is a placeholder until there's a logo.


## Money checkup (free)

Right after setup, `/app/chequeo` shows "Revisando tu mes…" and writes the free "Chequeo de dinero" with the Claude API, using the MVP PRD's system prompt word for word. The app does every calculation in `src/lib/budget.ts` and sends Claude only the totals; Claude writes the words. One checkup per person per month, saved in `checkups`, never paywalled. A new one is written on the 1st of each month.

Without `ANTHROPIC_API_KEY` (or if the API fails), a plain template writes the same four parts from the same numbers, so the flow never breaks. Demo mode only calls Claude when `ALLOW_DEMO_AI=true`, because demo mode has no sign-in.

The Claude calls use `claude-opus-5` with server-side refusal fallbacks (`fallbacks: "default"`) and medium effort. Change `MODEL` in `src/lib/ai.ts` if you want a cheaper model.

## Cuenta Clara Plus (Whop)

**$4.99/month or $39.99/year, with a 7-day free trial.**

| Free | Plus |
| --- | --- |
| Monthly budget and "what's left" | Everything in Free |
| Money checkup every month | 3-month forecast |
| 1 savings goal | Unlimited goals |
| Family sends with exchange rates | Rate alerts when the dollar buys 1% more |
| Email bill reminders | "¿Me alcanza?" helper, 30 questions a day |

Paywall rules from the PRD, all in code: the Plus screen and every Plus button stay hidden until the person's first checkup; Plus extras are blurred previews, never the person's own budget; prices sit side by side with "ahorras 33%"; the trial ends with an email 2 days before; cancel is two taps in Settings; no countdowns or scarcity.

How payment reaches the account:

1. `/api/checkout` creates a Whop checkout session with the user's id as metadata.
2. Whop copies it onto the membership and sends signed webhooks to `/api/webhooks/whop`.
3. The webhook updates `subscriptions`. Only the service role writes that table; the goal limit is also enforced by a database trigger.
4. Settings → Cancel Plus calls `/api/plus/cancel`, which cancels the Whop membership at the end of the period.

### Money Health Score (free)

Card on Home, 0–100, not a credit score. Four parts, 25 points each, on straight lines: emergency fund (months of bills and family sends saved, 0 → 3; counts goals named like an emergency fund plus the Safe to Spend cushion), debt minimums as a share of income (50% → 10%), goal saving as a share of income (0 → 15%), and what's left after everything and debt minimums (0 → 10%). Shows each part and one next step for the weakest. Logic in `src/lib/health.ts`.

### Smart warnings (free)

"Heads up" card on Home, up to three, from logged numbers only: the month would end short at this spending pace; a category up 30% and $50 against the same days of last month; the costliest debt at 20% APR or more (monthly interest); fees logged this month (notes like fee, overdraft, comisión, cargo); five or more "going out" purchases. Each links to where to act. Logic in `src/lib/warnings.ts`.

### Goal marketplace (free)

On Goals, "Pick a goal, get a plan": emergency fund (3 × monthly bills and sends), buy a home (down payment 0/3.5/5/10/20% + about 3% closing costs), buy a car (20% down), start a business (startup costs + 3 months of bills), retire (25 × a year of spending, monthly saving at an assumed 5% a year after inflation), and pay off debt (the debt plan). Each shows the monthly amount, total and date, steps, and a lesson, and saves as a goal (free plan's one-goal limit applies). Math in `src/lib/goal-templates.ts`; page `/app/metas/plan/[id]`.

### Spending patterns (Plus)

Card on Home once there are 15+ expenses over 3+ weeks (last 130 days): biggest day of the week (if 22%+ of spending), weekend vs. weekday per-day spending (if 30%+ more), the 3 days after a logged payday vs. other days (if 30%+ more), and the biggest category (if 35%+). By day only; entries have no time. Free users see their own patterns blurred with the trial button. Logic in `src/lib/patterns.ts`.

### Veterans: GI Bill planner (free)

`/app/veteranos/gi-bill`, linked from the VA page. Post-9/11 GI Bill estimate: eligibility tier from days of active duty (VA's table: 100/90/80/70/60/50%, or 100% with a Purple Heart or disability discharge), tuition VA covers per year (public in-state: your percentage of net tuition; private, foreign and trade schools, flight training and correspondence school: up to each yearly cap, rates effective Aug 1, 2026 to Jul 31, 2027), what's left to pay, and monthly housing from the E-5 with-dependents BAH the person enters (none on active duty). Books and supplies ($41.67 a credit up to 24 credits and $1,000 a year at colleges; $83 a month at trade schools), online-only housing ($1,261 at 100%) and foreign-school housing ($2,522), a Yellow Ribbon notice when private tuition is over the cap, and a short list of other help (tutoring, work-study, rural move). Update every August 1 in `src/lib/gi-bill.ts`.


### Veterans: benefits checklist (free)

`/app/veteranos/beneficios`, linked from the VA page. 14 benefits veterans often miss (disability, pension, state benefits, health care, life insurance, home loan and funding fee exemption, GI Bill, VR&E, SBA, DD214, veteran ID, national parks pass, burial), grouped, each linking only to the official government page and to our own tool when there is one. Checks are saved per person in this browser (`src/lib/vet-benefits.ts`). Ends with the Veterans Crisis Line (988, press 1).

### Cuenta Clara Academy (free, public)

`/aprende` and `/aprende/[slug]`: 10 short bilingual lessons (budget, emergency fund, APR, compound interest, credit score, sending money home, 1099 taxes, snowball vs. avalanche, pay stubs, VA benefits), each with an example and a "try it" link into the app. No account needed; linked from Home and the landing page. Content in `src/lib/lessons.ts`. General information, not financial, tax or legal advice.

### Safe to Spend (free; day-by-day view is Plus)

Top of Home. People type their account balance (never a bank login), next payday and how often they're paid (weekly, every 2 weeks, twice a month = 15th and last day, monthly), and an optional cushion. Safe to spend = balance, adjusted by entries logged after the day it was typed, minus bills due before payday (not already marked paid this month), family sends still to go this month, and the cushion. Shows days to payday and about how much a day; nudges to update a balance older than 3 days. Plus shows the projected balance each day until payday. With paycheck mode on, payday comes from the last paycheck. Math in `src/lib/safe-to-spend.ts`. Needs `supabase/migrations/005_safe_to_spend.sql`.

### Debt payoff plan (free; "what if" and milestones are Plus)

`/app/deudas`, linked from Goals. People add cards and loans (balance, APR, minimum). Free: payoff date and interest paying minimums only, and avalanche (highest rate first) vs. snowball (smallest balance first) with the same monthly money, where a paid-off debt's payment rolls into the next. Plus: "what if I add $25–$200 a month", progress from starting balances, debts paid off, and a countdown. Month-by-month math in `src/lib/debts.ts`; flags minimums that never cover the interest. General information, not financial advice. Needs `supabase/migrations/006_debts.sql`.

### Veterans: VA disability estimate (free)

`/app/veteranos`, linked from Goals. Combined rating the way VA calculates it (38 CFR 4.25 "VA math", rounded each step like Table I, final value to the nearest 10 with 5 rounding up) and the bilateral factor (38 CFR 4.26). Math in `src/lib/va.ts`, checked against Table I values and the regulation's bilateral example. Monthly amounts (30%–100%, with spouse, dependent parents, children under 18, children in school, and spouse Aid and Attendance) come from VA's published rates copied into `src/lib/va-rates.ts` with the effective date shown on screen; update them every December 1. 10% and 20% have one rate each. Says it's an estimate and not affiliated with VA, and points to accredited representatives.

### Paycheck mode (Plus)

For people paid weekly, every two weeks, in cash or by gig. Turn it on in Settings, then tap "Me pagaron" on Home each payday. Home shows what you can spend until the next payday: the pay, minus this period's share of bills, family sends and savings (a week is 12/52 of a month), minus what's been spent since payday. Bills due before the next payday are listed. Money logged before the period ends (tips, a second gig) joins that period. Math in `src/lib/paycheck.ts`.

Databases made before this feature need `supabase/migrations/002_paycheck_mode.sql` run once in the SQL editor.

### Tax set-aside (Plus)

For 1099, cash or gig pay with no taxes taken out. In Settings, pick 15–30% (general information, never tax advice). That share of income comes off "what's left" (and off each paycheck in paycheck mode), Home shows about how much is set aside since the current IRS estimated-tax period began and the next due date (Apr 15, Jun 15, Sep 15, Jan 15), and the daily cron emails a reminder 7 days before each due date. Logic in `src/lib/taxes.ts`.

Databases made before this feature need `supabase/migrations/003_tax_set_aside.sql` run once in the SQL editor.

### Say it or snap it (Plus)

At the top of Log: type or say "Gasté 25 en gasolina" (the mic uses the phone's speech recognition when available), or take a photo of a receipt or transfer slip. `/api/quick-log` turns it into entries the person checks before saving; "Fix it" loads one into the form below. With `ANTHROPIC_API_KEY`, Claude reads text and photos (structured output, checked against the person's own people, bills and goals in `src/lib/quick-log.ts`). Without it, typed or spoken text goes through a keyword reader and photos show "not turned on yet". Photos are shrunk in the browser, read once, and never stored.

### Paycheck checker (Plus)

`/app/pago` ("¿Te pagaron bien?", linked from Home): hourly rate and hours per week, optionally filled from a pay stub photo, compared with the stub's gross pay. Federal overtime (time and a half after 40 hours in a week) in `src/lib/paystub.ts`; Claude only reads the photo (`/api/paystub`, needs `ANTHROPIC_API_KEY`; typing works without it). Flags underpay and overtime paid below time and a half, points to the U.S. Department of Labor (1-866-487-9243), and says it's general information, not legal advice. With paycheck mode on, the stub's net pay can be logged as the paycheck.

### WhatsApp assistant (Plus)

Plus members connect their number in Settings: the app shows a code, WhatsApp opens with "CLARA 123456" typed, and the webhook links the number. Then they can text an expense ("Gasté 25 en gasolina"), send a receipt photo, ask "¿Me alcanza…?", text "saldo" for what's left, or "borrar" to undo the last thing logged. Replies are free-form text inside the 24-hour window their message opens; messages we start (weekly summary, reminders) need Meta-approved templates and are a later step.

Setup (Meta WhatsApp Cloud API): create a Meta app with WhatsApp, add a phone number, make a permanent system-user token, and set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `NEXT_PUBLIC_WHATSAPP_NUMBER` in Vercel. Webhook URL: `https://micuentaclara.app/api/whatsapp/webhook`, subscribed to `messages`. Run `supabase/migrations/004_whatsapp.sql`. Code: `src/lib/whatsapp.ts` (API, signature check), `src/lib/whatsapp-bot.ts` (what each message does).

## Emails

Sent through Resend in each person's language. Every marketing email has a one-click unsubscribe (footer link and `List-Unsubscribe` headers) and your mailing address.

| Email | When | Route |
| --- | --- | --- |
| Tu resumen / Your week | Sundays 6 PM in the person's timezone | `/api/cron/weekly` (hourly on Sundays) |
| Bill reminder, with "Mark as paid" | 3 days before the due day | `/api/cron/daily` |
| Chequeo listo / Checkup ready | 1st of the month | `/api/cron/checkups` |
| Plus trial ends in 2 days | 2 days before the trial ends | `/api/cron/daily` |
| Exchange-rate alert (Plus) | When the dollar buys 1% more than its recent low | `/api/cron/daily` |

By default the weekly email goes to everyone once, Sundays at 22:00 UTC (6 PM New York time in summer, 5 PM in winter), which fits Vercel's Hobby plan (one run per day per job). On Vercel Pro, set the `/api/cron/weekly` schedule to `0 * * * 0` and `WEEKLY_LOCAL_TIME=true` so each person gets it at 6 PM in their own timezone.

### Login emails (Supabase)

Supabase sends login and confirm emails through Resend (Authentication → Emails → SMTP Settings: `smtp.resend.com`, port 465, user `resend`, a Resend API key, sender `hola@micuentaclara.app`).

The default Supabase email templates are fine. Login and confirm emails are sent in implicit mode, so the link signs you in from any app (Mail, Gmail, Safari); `/auth/confirm` also accepts `token_hash` links if you ever customize the templates.

## Launch setup

1. Run `supabase/schema.sql` in Supabase.
2. Whop: create an API key, then `WHOP_API_KEY=… WHOP_ACCOUNT_ID=biz_… node scripts/whop-setup.mjs`. It creates "Cuenta Clara Plus" with both plans and the 7-day trial, and prints the plan ids. Check the prices in the Whop dashboard afterwards.
3. Whop → Developer → Webhooks: add `https://<your-domain>/api/webhooks/whop` with `membership.activated`, `membership.deactivated` and `membership.cancel_at_period_end_changed`.
4. Resend: verify your sending domain.
5. Set every variable in `.env.example` on Vercel.

### Money Style quiz (free, public)

`/estilo`, no account needed, linked from Home and the Academy. 8 questions; each answer points to one of four styles (Saver, Spender, Giver, Avoider). The most-picked style wins, with ties going to the style whose tips help most first (`src/lib/money-style.ts`). The result shows a strength, a watch-out, 3 tips linked to Academy lessons, a "try free" button and a share button. The style is saved in this browser (`cc-money-style`) for Clara to use later. Not a psychological test.

### Veterans: Home card (free)

Home asks once, "Are you a veteran or military family?" Yes shows a Veteran tools card with the VA disability estimate, GI Bill planner and benefits checklist; No hides the question. Remembered per person in this browser (`src/lib/veteran-pref.ts`) and changeable in Settings → Veterans.

### Money words dictionary (free, public)

`/palabras`, no account needed, linked from the landing page and the Academy. 37 money words (APR, escrow, 1099, credit utilization, TSP, BAH and more) with plain definitions in English and Spanish, examples and links to lessons or tools (`src/lib/glossary.ts`). All definitions are server-rendered with schema.org DefinedTerm data for search engines; the search box filters by name in either language first, then by definition.

### Clara, the AI money copilot (Free: 3 a month; Plus: 30 a day)

`/app/clara`, with a "Pregúntale a Clara" card on Home and the checkup page (it replaces the old Plus-only "¿Me alcanza?" box). The app does the math, Clara explains it: Claude gets eight tools (`src/lib/clara-tools.ts`) that return already-formatted numbers from the person's own data — month summary, Safe to Spend, check a purchase (yes / tight / no decided by code), what-if (one-time purchase, save more, spend less, extra debt payment), debts with payoff plans, goals, and links to Academy lessons and dictionary words, which show as chips under the answer. The server loads the numbers with the person's session (`src/lib/clara-server.ts`); demo mode sends the browser's snapshot instead. Crisis words always get the Veterans Crisis Line and 988, even past the limit, without depending on the model (`src/lib/clara-safety.ts`). Without `ANTHROPIC_API_KEY` (or if Claude fails), Clara says she's unavailable and shows what's left this month; those replies aren't counted.

Questions are rows in `ai_questions` (shared with WhatsApp questions for the limits). Saved conversations group them by `conversation_id` (**migration `007_clara.sql`**); deleting a conversation blanks the text but keeps the row so it still counts. Before the migration Clara works but history isn't saved.

### "What if?" chart (Plus, inside Clara)

When Clara checks a purchase or a what-if (buy it now or on payday, save more, spend less, pay more toward debt), the answer carries a chart of the bank balance for the next 30, 60 or 90 days, "as planned" vs. "with this decision" (`src/lib/what-if.ts`, `src/components/WhatIfChart.tsx`). The projection starts from the Safe to Spend balance and follows the plan: paychecks on each payday (monthly income over the pay cycle), bills on due days, sends and savings on the 1st, the tax set-aside, and everyday spending at this month's pace. Clara gets the lowest balance ahead and the 30/90-day balances from the same numbers. Free users see it blurred behind the Plus button. Two 2px lines with a legend, a crosshair tooltip (touch and arrow keys), and a weekly table view; the two series colors are validated for color blindness and contrast in light and dark.
