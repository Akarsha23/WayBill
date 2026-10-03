// lib/dispatcher/events.ts
// Append-only decision log. Corrections are new events, never edits.
import { supabase } from "@/lib/supabase/client";

export interface NewEvent {
  orderId: string;
  orderCode: string;
  action: string;
  detail?: string;
}

export async function logEvents(events: NewEvent[]) {
  if (!events.length) return;
  const { data } = await supabase.auth.getUser();
  const actor = data.user?.email ?? "Dispatcher";
  const { error } = await supabase.from("order_events").insert(
    events.map((e) => ({ order_id: e.orderId, order_code: e.orderCode, actor, action: e.action, detail: e.detail ?? null }))
  );
  // A failed log must not undo a saved allocation, but it must not be silent either.
  if (error) console.warn("Could not write decision trail:", error.message);
}