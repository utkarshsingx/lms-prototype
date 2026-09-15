import type { Metadata } from "next";
import { EscalationsPage } from "@/components/admin/config/escalations-page";

export const metadata: Metadata = { title: "Support escalation" };

export default function Page() {
  return <EscalationsPage />;
}
