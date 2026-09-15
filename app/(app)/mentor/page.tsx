import type { Metadata } from "next";
import { MentorDashboard } from "@/components/mentor/success/dashboard-page";

export const metadata: Metadata = { title: "Mentor dashboard" };

export default function Page() {
  return <MentorDashboard />;
}
