import type { Metadata } from "next";
import { MockInterviewsPage } from "@/components/mentor/careers/interviews-page";

export const metadata: Metadata = { title: "Mock interviews" };

export default function Page() {
  return <MockInterviewsPage />;
}
