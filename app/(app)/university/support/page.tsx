import type { Metadata } from "next";
import { SupportPage } from "@/components/university/engagement/support-page";

export const metadata: Metadata = { title: "Support tickets" };

export default function Page() {
  return <SupportPage />;
}
