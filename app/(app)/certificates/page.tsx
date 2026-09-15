import type { Metadata } from "next";
import { CertificatesPage } from "@/components/student/journeys/certificates-page";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <CertificatesPage />;
}
