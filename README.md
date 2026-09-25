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

In Authentication → Emails → Templates, the **Magic Link** and **Confirm signup** links point to `/auth/confirm` so they work in any browser (Mail, Gmail, Safari):

```html
<h2>Cuenta Clara</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar a Cuenta Clara / Log in to Cuenta Clara</a></p>
```

## Launch setup

1. Run `supabase/schema.sql` in Supabase.
2. Whop: create an API key, then `WHOP_API_KEY=… WHOP_ACCOUNT_ID=biz_… node scripts/whop-setup.mjs`. It creates "Cuenta Clara Plus" with both plans and the 7-day trial, and prints the plan ids. Check the prices in the Whop dashboard afterwards.
3. Whop → Developer → Webhooks: add `https://<your-domain>/api/webhooks/whop` with `membership.activated`, `membership.deactivated` and `membership.cancel_at_period_end_changed`.
4. Resend: verify your sending domain.
5. Set every variable in `.env.example` on Vercel.
