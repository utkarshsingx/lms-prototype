import type { Metadata } from "next";
import { AssessmentFrameworkPage } from "@/components/admin/config/assessment-framework-page";

export const metadata: Metadata = { title: "Assessment framework" };

export default function Page() {
  return <AssessmentFrameworkPage />;
}
