import type { Metadata } from "next";
import { MockInterviews } from "@/components/student/careers/mock-interviews";

export const metadata: Metadata = { title: "AI mock interviews" };

export default function Page() {
  return <MockInterviews />;
}
