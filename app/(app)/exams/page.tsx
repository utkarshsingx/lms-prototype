import type { Metadata } from "next";
import { ExamsPage } from "@/components/student/learn/exams-page";

export const metadata: Metadata = { title: "Exams & results" };

export default function Page() {
  return <ExamsPage />;
}
