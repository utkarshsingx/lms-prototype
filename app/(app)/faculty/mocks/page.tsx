import type { Metadata } from "next";
import { MocksPage } from "@/components/faculty/content/mocks-page";

export const metadata: Metadata = { title: "Quizzes & mocks" };

export default function Page() {
  return <MocksPage />;
}
