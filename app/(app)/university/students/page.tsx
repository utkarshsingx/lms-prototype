import type { Metadata } from "next";
import { UniversityStudentsPage } from "@/components/university/core/students-page";

export const metadata: Metadata = { title: "Students" };

export default function Page() {
  return <UniversityStudentsPage />;
}
