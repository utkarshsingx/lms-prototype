import type { Metadata } from "next";
import { PlanPage } from "@/components/student/journeys/plan-page";

export const metadata: Metadata = { title: "Completion plan" };

export default function Page() {
  return <PlanPage />;
}
