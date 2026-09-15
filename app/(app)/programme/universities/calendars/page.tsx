import type { Metadata } from "next";
import { CalendarsPage } from "@/components/programme/universities/calendars-page";

export const metadata: Metadata = { title: "Academic calendars" };

export default function Page() {
  return <CalendarsPage />;
}
