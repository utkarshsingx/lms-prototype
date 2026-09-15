import type { Metadata } from "next";
import { JourneyPage } from "@/components/student/learn/journey-page";

export const metadata: Metadata = { title: "ACCA journey" };

export default function Page() {
  return <JourneyPage />;
}
