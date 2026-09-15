import type { Metadata } from "next";
import { ReadinessPage } from "@/components/student/learn/readiness-page";

export const metadata: Metadata = { title: "Readiness score" };

export default function Page() {
  return <ReadinessPage />;
}
