import type { Metadata } from "next";
import { CurriculumPage } from "@/components/programme/universities/curriculum-page";

export const metadata: Metadata = { title: "Curriculum mapping" };

export default function Page() {
  return <CurriculumPage />;
}
