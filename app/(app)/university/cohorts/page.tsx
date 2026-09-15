import type { Metadata } from "next";
import { UniversityCohortsPage } from "@/components/university/core/cohorts-page";

export const metadata: Metadata = { title: "Intakes & cohorts" };

export default function Page() {
  return <UniversityCohortsPage />;
}
