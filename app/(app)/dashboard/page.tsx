import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

/* Home answers two questions and stops: what do I do next, and what is coming
   up. It adapts to the student type: graduates see their completion plan and
   batch, undergraduates their university identity and latest announcement. */
export default function DashboardPage() {
  return <DashboardView />;
}
