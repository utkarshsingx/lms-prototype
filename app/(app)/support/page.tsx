import type { Metadata } from "next";
import { SupportPage } from "@/components/student/help/support-page";

export const metadata: Metadata = { title: "Support tickets" };

export default function Page() {
  return <SupportPage />;
}
