import type { Metadata } from "next";
import { UniversityReportsPage } from "@/components/university/core/reports-page";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <UniversityReportsPage />;
}
