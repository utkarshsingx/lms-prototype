import type { Metadata } from "next";
import { FaqsPage } from "@/components/programme/support/faqs-page";

export const metadata: Metadata = { title: "FAQs & trends" };

export default function Page() {
  return <FaqsPage />;
}
