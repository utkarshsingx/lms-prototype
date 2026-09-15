import type { Metadata } from "next";
import { MentorStudentsPage } from "@/components/mentor/success/students-page";

export const metadata: Metadata = { title: "My students" };

export default function Page() {
  return <MentorStudentsPage />;
}
