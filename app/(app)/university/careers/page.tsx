import type { Metadata } from "next";
import { CareersPage } from "@/components/university/engagement/careers-page";

export const metadata: Metadata = { title: "Careers" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <CareersPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
