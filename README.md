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

## Bill reminder emails

`/api/cron/reminders` runs daily via `vercel.json` and emails anyone with a bill due in 3 days, in their language. Set these on Vercel:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, and `REMINDER_FROM_EMAIL` from a domain verified in Resend
- `CRON_SECRET`: Vercel sends it automatically to cron routes

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
| 1 | `/` | Landing |
| 2 | `/login` | Sign up / Log in (password or magic link) |
| 3 | `/app/setup` | Setup wizard: income, bills, family sends, one goal |
| 4 | `/app` | Dashboard |
| 5 | `/app/add` | Add entry, with one-tap presets for regular sends |
| 6 | `/app/envios` | Family sends with live exchange rates |
| 7 | `/app/metas` | Savings goals |
| 8 | `/app/ajustes` | Settings |

Language is chosen on the landing page, can be switched on every screen, and is saved to the profile.
