# Launch checklist

Where Cuenta Clara stands, and what's next.

## Done
- [x] App, landing page, Cuenta Clara Plus and emails built (see README)
- [x] Code on GitHub: `9vh2d5wv54-ctrl/Cuenta-Clara`
- [x] Live on Vercel: https://cuenta-clara-six.vercel.app (team "Cuenta Clara", Hobby plan)
- [x] Supabase project created (`nbmmllyhddckoqsnxtki`), `supabase/schema.sql` run
- [x] Supabase connected to Vercel through the Supabase → Vercel integration (keys sync automatically)
- [x] Vercel env var added by hand: `APP_URL` (and `NEXT_PUBLIC_SUPABASE_URL`)
- [x] Redeploy pushed (commit d02808e) so the app uses the real database

## Next
1. [x] Confirm the deploy is Ready and signing up shows no "Modo de prueba" banner (first real signup worked)
2. [x] Supabase → Authentication → URL Configuration
       Site URL: `https://cuenta-clara-six.vercel.app`
       Redirect URL: `https://cuenta-clara-six.vercel.app/auth/callback`
3. [x] Payments: live trial started and canceled from the app
       [x] Whop product "Cuenta Clara Plus": $4.99/month and $39.99/year, 7-day trial (made in the dashboard)
       [x] `WHOP_API_KEY` in Vercel (the app finds both plans by price; no plan ids needed)
       [x] Whop webhook → `https://cuenta-clara-six.vercel.app/api/webhooks/whop`, secret in Vercel as `WHOP_WEBHOOK_SECRET`
       [x] Test: finish setup → checkup → "Pruébalo gratis 7 días" → trial starts → Settings shows "Estás probando Plus" → cancel
4. [ ] AI checkup: `ANTHROPIC_API_KEY` in Vercel (optional; a template is used without it)
5. [ ] Emails
       [x] `RESEND_API_KEY` and `CRON_SECRET` in Vercel
       [ ] Get a PO box, add it as `MAILING_ADDRESS` (footer says "Cuenta Clara · Newark, NJ" until then) — required before emailing real users
       [x] micuentaclara.app verified in Resend; test email from hola@micuentaclara.app delivered to Gmail
       [x] Supabase login emails sent through Resend (custom SMTP)
       [x] Email login link works from the Mail app on micuentaclara.app
6. [x] Own domain
       [x] Bought micuentaclara.app on Vercel, connected to the project
       [x] Vercel `APP_URL` → `https://micuentaclara.app`
       [x] Supabase Site URL → `https://micuentaclara.app`, add redirect `https://micuentaclara.app/auth/callback`
7. [ ] Confirm "Hecho en Newark, NJ" on the landing page
8. [x] Whop webhook URL → `https://micuentaclara.app/api/webhooks/whop` (old URL still works)
9. [ ] 10 test users, then ads with the PRD's daily launch check

Paycheck mode:
- [x] Built (Plus): Settings → Paycheck mode, "Me pagaron" on Home
- [x] Run `supabase/migrations/002_paycheck_mode.sql` in the Supabase SQL editor
- [ ] Turn it on and log a paycheck on micuentaclara.app

Tax set-aside:
- [x] Built (Plus): Settings → Tax set-aside, Taxes card on Home, reminder email 7 days before IRS dates
- [x] Run `supabase/migrations/003_tax_set_aside.sql` in the Supabase SQL editor

Say it or snap it:
- [x] Built (Plus): voice/typed logging works now; receipt photos turn on with `ANTHROPIC_API_KEY`

Paycheck checker:
- [x] Built (Plus): /app/pago; typing works now, stub photos turn on with `ANTHROPIC_API_KEY`

WhatsApp assistant:
- [x] Built (Plus): connect in Settings; text expenses, photos, "saldo", "¿Me alcanza?", "borrar"
- [ ] Run `supabase/migrations/004_whatsapp.sql` in the Supabase SQL editor
- [ ] Meta: WhatsApp Business app, phone number, permanent token, webhook → `https://micuentaclara.app/api/whatsapp/webhook`
- [ ] Vercel: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `NEXT_PUBLIC_WHATSAPP_NUMBER`
- [ ] Later: Meta-approved templates for weekly summary and reminders by WhatsApp

Safe to Spend:
- [x] Built (free; day-by-day projection is Plus)
- [x] Run `supabase/migrations/005_safe_to_spend.sql` in the Supabase SQL editor

Debt payoff plan:
- [x] Built (free; what-if, milestones and countdown are Plus)
- [ ] Run `supabase/migrations/006_debts.sql` in the Supabase SQL editor

Veterans:
- [x] VA combined rating calculator (free)
- [x] Monthly amounts for 30%–100% with dependents (VA rates effective Dec 1, 2025) in `src/lib/va-rates.ts`
- [x] 10% and 20% monthly amounts (VA.gov, effective Dec 1, 2025)
- [ ] Every December 1: update `src/lib/va-rates.ts` with VA's new rates and effective date

Accounts:
- [x] Vercel project (team "Cuenta Clara", signed in with Apple) reconnected to GitHub `9vh2d5wv54-ctrl/Cuenta-Clara`
- [ ] Vercel: change that account's email to one you can read (it's an Apple hidden-relay address)
- [ ] Delete the unused copy "cuenta-clara" (cuenta-clara-xi.vercel.app) in the mannyabreu92@gmail.com Vercel account

Later:
- [ ] Make the GitHub repo private (Settings → Danger Zone). GitHub emails a code to the Sign in with Apple relay address; find it in the inbox Apple forwards to (iPhone Settings → your name → Sign in with Apple → GitHub).
- [ ] Delete the unused Whop API key "Cuenta Clara app" (keep "Cuenta Clara app2").
- [ ] `ANTHROPIC_API_KEY` in Vercel once the first users sign up.

Tip: adding variables and copying keys is much easier on a computer than on a phone.
