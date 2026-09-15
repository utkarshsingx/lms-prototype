import type { Metadata } from "next";
import { WhatsappPage } from "@/components/programme/support/whatsapp-page";

export const metadata: Metadata = { title: "WhatsApp" };

export default function Page() {
  return <WhatsappPage />;
}
