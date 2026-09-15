import type { Metadata } from "next";
import { FacultyDashboard } from "@/components/faculty/teaching/dashboard-page";

export const metadata: Metadata = { title: "Faculty dashboard" };

export default function Page() {
  return <FacultyDashboard />;
}
