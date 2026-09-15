import type { Metadata } from "next";
import { CareerTransitionPage } from "@/components/student/journeys/career-transition-page";

export const metadata: Metadata = { title: "Career transition" };

export default function Page() {
  return <CareerTransitionPage />;
}
