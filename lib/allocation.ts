import type { Order, Vehicle } from "./types";

export interface RuleResult {
  ok: boolean;
  pass: string;
  fail: string;
}

/** The six dispatch rules from the prototype. */
export function evaluateRules(o: Order, v: Vehicle): RuleResult[] {
  const kg = v.usedKg + o.kg;
  const m3 = v.usedM3 + o.m3;
  return [
    { ok: kg <= v.maxKg, pass: `Weight fits (${kg} of ${v.maxKg} kg)`, fail: `Over weight limit (${kg} of ${v.maxKg} kg)` },
    { ok: m3 <= v.maxM3, pass: "Volume fits", fail: "Over volume limit" },
    { ok: o.temp === "Ambient" || !!v.refrigerated, pass: "Cold-chain compatible", fail: "Chilled or frozen goods need a refrigerated vehicle" },
    { ok: !o.vanOnly || !!v.van, pass: "Outlet access OK", fail: "Van-only outlet: trucks cannot serve it" },
    { ok: v.routesToday < 2, pass: `Route count OK (${v.routesToday} of 2)`, fail: "Vehicle already ran 2 routes today" },
    { ok: v.fuelPct > 10, pass: `Fuel quota OK (${v.fuelPct}% left)`, fail: `Fuel quota nearly used (${v.fuelPct}% left)` },
  ];
}

export const allPass = (rules: RuleResult[]) => rules.every((r) => r.ok);

export function assign(o: Order, v: Vehicle): Vehicle {
  return { ...v, usedKg: v.usedKg + o.kg, usedM3: v.usedM3 + o.m3 };
}

export interface AutoResult {
  vehicles: Vehicle[];
  assigned: { orderId: string; vehicleId: string }[];
  unassigned: { order: Order; reason: string }[];
}

/**
 * First-fit automatic allocation. Same behaviour as the prototype:
 * orders are walked from the end of the queue, each goes to the first vehicle that passes all rules.
 */
export function autoAllocate(orders: Order[], vehicles: Vehicle[]): AutoResult {
  let fleet = vehicles.map((v) => ({ ...v }));
  const assigned: AutoResult["assigned"] = [];
  const unassigned: AutoResult["unassigned"] = [];

  for (let i = orders.length - 1; i >= 0; i--) {
    const o = orders[i];
    const reasons: string[] = [];
    let placed = false;
    for (let j = 0; j < fleet.length; j++) {
      const rules = evaluateRules(o, fleet[j]);
      if (allPass(rules)) {
        fleet = fleet.map((v, k) => (k === j ? assign(o, v) : v));
        assigned.push({ orderId: o.id, vehicleId: fleet[j].id });
        placed = true;
        break;
      }
      reasons.push(`${fleet[j].id}: ${rules.filter((r) => !r.ok).map((r) => r.fail).join(", ")}`);
    }
    if (!placed) unassigned.push({ order: o, reason: reasons.join(" | ") });
  }
  return { vehicles: fleet, assigned, unassigned };
}
