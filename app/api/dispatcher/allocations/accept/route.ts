// app/api/dispatcher/allocations/accept/route.ts
// POST { plan: Record<orderId, { vehicleId: string | null, reason?: string }> }
// Commits an entire suggested plan in one transaction: every assigned
// order gets its vehicle set and an "Allocated" event; every deferred
// order gets its reason recorded and a "Deferred" event. A deferral
// with no reason should be rejected here even if the client validated
// it, since this is the authoritative check.

import { NextRequest, NextResponse } from "next/server";
import { ORDERS, VEHICLES } from "@/lib/dispatcher/data";
import { checkAssignment } from "@/lib/dispatcher/rules";
import { Plan } from "@/lib/dispatcher/rules";

export async function POST(req: NextRequest) {
  const { plan } = (await req.json()) as { plan: Plan };

  const errors: string[] = [];

  for (const order of ORDERS) {
    const assignment = plan[order.id];
    if (!assignment) {
      errors.push(`${order.id}: missing from plan`);
      continue;
    }
    if (assignment.vehicleId) {
      const vehicle = VEHICLES.find((v) => v.id === assignment.vehicleId);
      if (!vehicle) {
        errors.push(`${order.id}: vehicle ${assignment.vehicleId} not found`);
        continue;
      }
      const failing = checkAssignment(order, vehicle).filter((c) => !c.ok);
      if (failing.length > 0) {
        errors.push(`${order.id}: fails ${failing.map((f) => f.key).join(", ")}`);
      }
    } else if (!assignment.reason) {
      errors.push(`${order.id}: deferred with no reason`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Plan failed validation", details: errors }, { status: 422 });
  }

  // TODO: persist all assignments and deferrals in one transaction, each
  // as its own decision-trail event, so the accept is atomic.

  const assigned = Object.values(plan).filter((a) => a.vehicleId).length;
  const deferred = ORDERS.length - assigned;

  return NextResponse.json({ ok: true, assigned, deferred });
}
