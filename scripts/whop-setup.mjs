// One-time setup: creates the "Cuenta Clara Premium" product and its two plans in Whop,
// then prints the env vars to copy into Vercel.
//
//   WHOP_API_KEY=... WHOP_ACCOUNT_ID=biz_... node scripts/whop-setup.mjs
//
// Safe to read before running: it only creates; it never changes or deletes anything.
import { WhopClient } from "@whop/sdk";

const token = process.env.WHOP_API_KEY;
const account_id = process.env.WHOP_ACCOUNT_ID;
if (!token || !account_id) {
  console.error("Set WHOP_API_KEY and WHOP_ACCOUNT_ID (your business id, starts with biz_).");
  process.exit(1);
}

const whop = new WhopClient({ token });

const product = await whop.products.create({
  account_id,
  title: "Cuenta Clara Plus",
  headline: "Pronóstico de 3 meses, metas ilimitadas, alertas de cambio",
  description:
    "Cuenta Clara es gratis. Plus suma el pronóstico de 3 meses, metas de ahorro ilimitadas, alertas cuando el cambio te favorece y la ayuda \"¿Me alcanza?\". / Cuenta Clara is free. Plus adds a 3-month forecast, unlimited savings goals, exchange-rate alerts, and the \"¿Me alcanza?\" helper.",
});

// 7-day free trial on both plans (MVP PRD → Premium plan).
const common = { account_id, product_id: product.id, currency: "usd", plan_type: "renewal", trial_period_days: 7 };

const monthly = await whop.plans.create({
  ...common,
  title: "Mensual / Monthly",
  renewal_price: 4.99,
  billing_period: 30,
});

const yearly = await whop.plans.create({
  ...common,
  title: "Anual / Yearly",
  renewal_price: 39.99,
  billing_period: 365,
});

console.log(`
Created product ${product.id}. Add these to Vercel (and .env.local):

WHOP_ACCOUNT_ID=${account_id}
WHOP_PLAN_MONTHLY=${monthly.id}
WHOP_PLAN_YEARLY=${yearly.id}

Then in Whop → Developer → Webhooks, add https://<your-domain>/api/webhooks/whop
with membership.activated, membership.deactivated and membership.cancel_at_period_end_changed,
and set WHOP_WEBHOOK_SECRET to its signing secret.
`);
