import type { Metadata } from "next";
import { ProgrammeDashboard } from "@/components/programme/ops/dashboard-page";

export const metadata: Metadata = { title: "Programme dashboard" };

export default function Page() {
  return <ProgrammeDashboard />;
}
