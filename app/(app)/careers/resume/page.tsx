import type { Metadata } from "next";
import { ResumeBuilder } from "@/components/student/careers/resume-builder";

export const metadata: Metadata = { title: "Resume builder" };

export default function Page() {
  return <ResumeBuilder />;
}
