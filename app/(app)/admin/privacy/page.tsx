import type { Metadata } from "next";
import { PrivacyPage } from "@/components/admin/config/privacy-page";

export const metadata: Metadata = { title: "Data & privacy" };

export default function Page() {
  return <PrivacyPage />;
}
