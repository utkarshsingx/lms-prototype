import type { Metadata } from "next";
import { ExemptionsPage } from "@/components/student/journeys/exemptions-page";

export const metadata: Metadata = { title: "Exemptions" };

export default function Page() {
  return <ExemptionsPage />;
}
