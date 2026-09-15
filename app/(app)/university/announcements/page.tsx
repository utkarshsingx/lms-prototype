import type { Metadata } from "next";
import { AnnouncementsPage } from "@/components/university/engagement/announcements-page";

export const metadata: Metadata = { title: "Announcements" };

export default function Page() {
  return <AnnouncementsPage />;
}
