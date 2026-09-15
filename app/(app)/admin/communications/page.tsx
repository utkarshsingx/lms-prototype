import type { Metadata } from "next";
import { CommunicationsPage } from "@/components/admin/config/communications-page";

export const metadata: Metadata = { title: "Communications" };

export default function Page() {
  return <CommunicationsPage />;
}
