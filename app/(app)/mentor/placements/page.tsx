import type { Metadata } from "next";
import { PlacementsPage } from "@/components/mentor/careers/placements-page";

export const metadata: Metadata = { title: "Placement pipeline" };

export default function Page() {
  return <PlacementsPage />;
}
