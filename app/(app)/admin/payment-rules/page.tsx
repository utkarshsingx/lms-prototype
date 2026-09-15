import type { Metadata } from "next";
import { PaymentRulesPage } from "@/components/admin/config/payment-rules-page";

export const metadata: Metadata = { title: "Payment rules" };

export default function Page() {
  return <PaymentRulesPage />;
}
