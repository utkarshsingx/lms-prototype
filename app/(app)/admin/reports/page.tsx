import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/core/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <AdminReports initialTab={typeof tab === "string" ? tab : undefined} />;
}
