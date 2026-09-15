import type { Metadata } from "next";
import { CurriculumPage } from "@/components/university/engagement/curriculum-page";

export const metadata: Metadata = { title: "Curriculum & mapping" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <CurriculumPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
