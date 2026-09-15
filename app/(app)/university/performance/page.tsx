import type { Metadata } from "next";
import { UniversityPerformancePage } from "@/components/university/core/performance-page";

export const metadata: Metadata = { title: "Performance" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <UniversityPerformancePage initialTab={typeof tab === "string" ? tab : undefined} />;
}
