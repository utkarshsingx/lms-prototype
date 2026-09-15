import type { Metadata } from "next";
import { StudentsPage } from "@/components/programme/ops/students-page";

export const metadata: Metadata = { title: "Students" };

export default function Page() {
  return <StudentsPage />;
}
