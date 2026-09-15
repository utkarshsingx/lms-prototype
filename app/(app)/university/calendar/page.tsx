import type { Metadata } from "next";
import { CalendarPage } from "@/components/university/engagement/calendar-page";

export const metadata: Metadata = { title: "Academic calendar" };

export default function Page() {
  return <CalendarPage />;
}
