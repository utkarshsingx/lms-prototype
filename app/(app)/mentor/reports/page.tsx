import type { Metadata } from "next";
import { PlacementReportsPage } from "@/components/mentor/careers/reports-page";

export const metadata: Metadata = { title: "Placement reports" };

export default function Page() {
  return <PlacementReportsPage />;
}
