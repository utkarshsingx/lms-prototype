import type { Metadata } from "next";
import { BatchesPage } from "@/components/student/journeys/batches-page";

export const metadata: Metadata = { title: "Batches & cohorts" };

export default function Page() {
  return <BatchesPage />;
}
