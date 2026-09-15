import type { Metadata } from "next";
import { AnnouncementsPage } from "@/components/programme/ops/announcements-page";

export const metadata: Metadata = { title: "Announcements & resources" };

export default function Page() {
  return <AnnouncementsPage />;
}
