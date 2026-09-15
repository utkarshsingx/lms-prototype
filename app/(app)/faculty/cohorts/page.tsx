import type { Metadata } from "next";
import { FacultyCohortsPage } from "@/components/faculty/teaching/cohorts-page";

export const metadata: Metadata = { title: "Papers & cohorts" };

export default function Page() {
  return <FacultyCohortsPage />;
}
