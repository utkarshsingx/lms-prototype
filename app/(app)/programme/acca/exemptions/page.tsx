import type { Metadata } from "next";
import { ExemptionsPage } from "@/components/programme/acca/exemptions-page";

export const metadata: Metadata = { title: "Exemptions" };

export default function Page() {
  return <ExemptionsPage />;
}
