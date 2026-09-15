import type { Metadata } from "next";
import { MocksPage } from "@/components/student/learn/mocks-page";

export const metadata: Metadata = { title: "Mock exams" };

export default function Page() {
  return <MocksPage />;
}
