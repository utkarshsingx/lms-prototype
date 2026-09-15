import type { Metadata } from "next";
import { FacultyAnalyticsPage } from "@/components/faculty/teaching/analytics-page";

export const metadata: Metadata = { title: "Analytics" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { paper } = await searchParams;
  return <FacultyAnalyticsPage initialPaper={typeof paper === "string" ? paper : undefined} />;
}
