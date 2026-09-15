import type { Metadata } from "next";
import { MentorPlansPage } from "@/components/mentor/success/plans-page";

export const metadata: Metadata = { title: "Action plans & sessions" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <MentorPlansPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
