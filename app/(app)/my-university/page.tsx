import type { Metadata } from "next";
import { MyUniversityPage } from "@/components/student/journeys/my-university-page";

export const metadata: Metadata = { title: "My university" };

export default function Page() {
  return <MyUniversityPage />;
}
