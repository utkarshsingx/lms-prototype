import type { Metadata } from "next";
import { RoadmapPage } from "@/components/student/journeys/roadmap-page";

export const metadata: Metadata = { title: "Semester roadmap" };

export default function Page() {
  return <RoadmapPage />;
}
