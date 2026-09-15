import type { Metadata } from "next";
import { MentorAlertsPage } from "@/components/mentor/success/alerts-page";

export const metadata: Metadata = { title: "Risk alerts" };

export default function Page() {
  return <MentorAlertsPage />;
}
