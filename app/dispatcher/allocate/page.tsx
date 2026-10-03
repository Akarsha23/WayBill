// app/dispatcher/allocate/page.tsx
// The old mock-data allocate screen is replaced by /dispatcher/plan.
import { redirect } from "next/navigation";

export default function AllocateRedirect() {
  redirect("/dispatcher/plan");
}


