import type { Metadata } from "next";
import { UniversityDashboard } from "@/components/university/core/dashboard-page";

export const metadata: Metadata = { title: "University dashboard" };

export default function Page() {
  return <UniversityDashboard />;
}
