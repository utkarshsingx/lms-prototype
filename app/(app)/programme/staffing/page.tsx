import type { Metadata } from "next";
import { StaffingPage } from "@/components/programme/ops/staffing-page";

export const metadata: Metadata = { title: "Faculty & mentors" };

export default function Page() {
  return <StaffingPage />;
}
