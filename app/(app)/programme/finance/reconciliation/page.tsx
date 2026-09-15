import type { Metadata } from "next";
import { ReconciliationPage } from "@/components/programme/finance/reconciliation-page";

export const metadata: Metadata = { title: "Reconciliation & refunds" };

export default function Page() {
  return <ReconciliationPage />;
}
