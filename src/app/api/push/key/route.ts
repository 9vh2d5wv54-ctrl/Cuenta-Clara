import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push";

// The public key phones use to sign up for notifications (safe to share).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ key: vapidPublicKey() }, { headers: { "Cache-Control": "public, max-age=300" } });
}
