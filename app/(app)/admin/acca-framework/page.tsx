import type { Metadata } from "next";
import { AccaFrameworkPage } from "@/components/admin/config/acca-framework-page";

export const metadata: Metadata = { title: "ACCA framework" };

export default function Page() {
  return <AccaFrameworkPage />;
}
