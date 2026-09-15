import type { Metadata } from "next";
import { ProgressionPage } from "@/components/programme/acca/progression-page";

export const metadata: Metadata = { title: "Progression" };

export default function Page() {
  return <ProgressionPage />;
}
