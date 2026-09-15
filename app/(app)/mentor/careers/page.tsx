import type { Metadata } from "next";
import { CareerProfilesPage } from "@/components/mentor/careers/careers-page";

export const metadata: Metadata = { title: "Career profiles" };

export default function Page() {
  return <CareerProfilesPage />;
}
