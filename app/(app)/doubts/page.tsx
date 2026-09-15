import type { Metadata } from "next";
import { DoubtsPage } from "@/components/student/help/doubts-page";

export const metadata: Metadata = { title: "Doubt resolution" };

export default function Page() {
  return <DoubtsPage />;
}
