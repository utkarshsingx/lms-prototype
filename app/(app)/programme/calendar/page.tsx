import type { Metadata } from "next";
import { CalendarPage } from "@/components/programme/ops/calendar-page";

export const metadata: Metadata = { title: "Programme calendar" };

export default function Page() {
  return <CalendarPage />;
}
