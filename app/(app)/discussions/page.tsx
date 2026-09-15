import type { Metadata } from "next";
import { CommunityPage } from "@/components/discussions/community-page";

export const metadata: Metadata = { title: "Community" };

export default function Page() {
  return <CommunityPage />;
}
