// app/api/dispatcher/deferrals/route.ts
// POST { orderId, reason, note? } -> defer one order to the next run.
// Rejects if reason is missing or not one of the fixed DEFERRAL_REASONS —
// the UI already enforces this, but the API is the source of truth.

import { NextRequest, NextResponse } from "next/server";
import { DEFERRAL_REASONS } from "@/lib/dispatcher/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, reason, note } = body as { orderId: string; reason: string; note?: string };

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }
  if (!reason || !DEFERRAL_REASONS.includes(reason as (typeof DEFERRAL_REASONS)[number])) {
    return NextResponse.json(
      { error: "A valid reason is required", allowed: DEFERRAL_REASONS },
      { status: 422 }
    );
  }

  // TODO: persist — set order.status = "deferred", order.deferralReason = reason,
  // order.deferralNote = note ?? null, and append a decision-trail event
  // { actor: currentUser, action: "Deferred to next run", detail: reason }.

  return NextResponse.json({
    ok: true,
    orderId,
    reason,
    note: note ?? null,
    recordedAt: new Date().toISOString(),
  });
}
