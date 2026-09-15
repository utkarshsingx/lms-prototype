import type { Metadata } from "next";
import { ContentRepositoryPage } from "@/components/admin/config/content-page";

export const metadata: Metadata = { title: "Content repository" };

export default function Page() {
  return <ContentRepositoryPage />;
}
