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
       [ ] Test: finish setup → checkup → "Pruébalo gratis 7 días" → trial starts → Settings shows "Estás probando Plus" → cancel
4. [ ] AI checkup: `ANTHROPIC_API_KEY` in Vercel (optional; a template is used without it)
5. [ ] Emails
       [x] `RESEND_API_KEY` and `CRON_SECRET` in Vercel
       [ ] Get a PO box, add it as `MAILING_ADDRESS` (footer says "Cuenta Clara · Newark, NJ" until then) — required before emailing real users
       [x] micuentaclara.app verified in Resend; test email from hola@micuentaclara.app delivered to Gmail
       [x] Supabase login emails sent through Resend (custom SMTP)
6. [ ] Own domain
       [x] Bought micuentaclara.app on Vercel, connected to the project
       [ ] Vercel `APP_URL` → `https://micuentaclara.app`
       [ ] Supabase Site URL → `https://micuentaclara.app`, add redirect `https://micuentaclara.app/auth/callback`
7. [ ] Confirm "Hecho en Newark, NJ" on the landing page
8. [ ] 10 test users, then ads with the PRD's daily launch check

Tip: adding variables and copying keys is much easier on a computer than on a phone.
