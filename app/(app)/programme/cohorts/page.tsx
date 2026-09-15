import type { Metadata } from "next";
import { CohortsPage } from "@/components/programme/ops/cohorts-page";

export const metadata: Metadata = { title: "Cohorts & batches" };

export default function Page() {
  return <CohortsPage />;
}
