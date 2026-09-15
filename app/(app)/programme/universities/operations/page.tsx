import type { Metadata } from "next";
import { OperationsPage } from "@/components/programme/universities/operations-page";

export const metadata: Metadata = { title: "University operations" };

export default function Page() {
  return <OperationsPage />;
}
