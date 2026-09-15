import type { Metadata } from "next";
import { JobsPage } from "@/components/student/careers/jobs-page";

export const metadata: Metadata = { title: "Jobs and internships" };

export default function Page() {
  return <JobsPage />;
}
