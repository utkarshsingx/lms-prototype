import type { Metadata } from "next";
import { RegistrationsPage } from "@/components/programme/acca/registrations-page";

export const metadata: Metadata = { title: "Registrations" };

export default function Page() {
  return <RegistrationsPage />;
}
