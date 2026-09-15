import type { Metadata } from "next";
import { FeesPage } from "@/components/programme/finance/fees-page";

export const metadata: Metadata = { title: "Fees & payments" };

export default function Page() {
  return <FeesPage />;
}
