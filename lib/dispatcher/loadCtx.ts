// lib/dispatcher/loadCtx.ts
import { supabase } from "@/lib/supabase/client";
import type { Ctx } from "./allocation";

/** Loads district_travel and service_allowance so every page uses the same trip-time inputs. */
export async function loadCtx(): Promise<Ctx> {
  const [trv, alw] = await Promise.all([
    supabase.from("district_travel").select("*"),
    supabase.from("service_allowance").select("*"),
  ]);
  if (trv.error) throw new Error(trv.error.message);
  if (alw.error) throw new Error(alw.error.message);

  const ctx: Ctx = { travel: {}, allowance: {} };
  (trv.data ?? []).forEach((r: any) => {
    ctx.travel[r.district] = {
      toDistrictMin: Number(r.depot_to_district_freeflow_min),
      toDistrictKm: Number(r.depot_to_district_km),
      interMin: Number(r.inter_stop_freeflow_min),
      interKm: Number(r.inter_stop_km),
    };
  });
  (alw.data ?? []).forEach((r: any) => {
    ctx.allowance[`${r.brand}|${r.dock_type}`] = Number(r.service_allowance_min);
  });
  return ctx;
}