import type { Metadata } from "next";
import { CareerCentre } from "@/components/student/careers/career-centre";

export const metadata: Metadata = { title: "Career centre" };

export default function Page() {
  return <CareerCentre />;
}
