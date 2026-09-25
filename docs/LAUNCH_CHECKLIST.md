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
1. [ ] Confirm the deploy is Ready and signing up shows no "Modo de prueba" banner
2. [ ] Supabase → Authentication → URL Configuration
       Site URL: `https://cuenta-clara-six.vercel.app`
       Redirect URL: `https://cuenta-clara-six.vercel.app/auth/callback`
3. [ ] Payments: Whop API key, run `scripts/whop-setup.mjs`, add plan ids + webhook secret to Vercel
4. [ ] AI checkup: `ANTHROPIC_API_KEY` in Vercel (optional; a template is used without it)
5. [ ] Emails: Resend key, `MAILING_ADDRESS`, `EMAIL_LINK_SECRET`, `CRON_SECRET` in Vercel
6. [ ] Own domain (Vercel → Settings → Domains), then update Supabase URLs and `APP_URL`
7. [ ] Confirm "Hecho en Newark, NJ" on the landing page
8. [ ] 10 test users, then ads with the PRD's daily launch check

Tip: adding variables and copying keys is much easier on a computer than on a phone.
