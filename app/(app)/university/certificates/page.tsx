import type { Metadata } from "next";
import { CertificatesPage } from "@/components/university/engagement/certificates-page";

export const metadata: Metadata = { title: "Joint certificates" };

export default function Page() {
  return <CertificatesPage />;
}
