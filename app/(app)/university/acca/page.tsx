import type { Metadata } from "next";
import { UniversityAccaPage } from "@/components/university/core/acca-page";

export const metadata: Metadata = { title: "ACCA progress" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <UniversityAccaPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
