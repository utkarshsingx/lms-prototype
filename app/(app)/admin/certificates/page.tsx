import type { Metadata } from "next";
import { CertificatesConfigPage } from "@/components/admin/config/certificates-page";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <CertificatesConfigPage />;
}
