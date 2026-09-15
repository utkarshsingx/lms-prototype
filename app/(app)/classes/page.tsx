import type { Metadata } from "next";
import { ClassesPage } from "@/components/student/learn/classes-page";

export const metadata: Metadata = { title: "Live classes" };

export default function Page() {
  return <ClassesPage />;
}
