import type { Metadata } from "next";
import { ExamsPage } from "@/components/programme/acca/exams-page";

export const metadata: Metadata = { title: "Exams & results" };

export default function Page() {
  return <ExamsPage />;
}
