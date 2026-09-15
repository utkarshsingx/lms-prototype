import type { Metadata } from "next";
import { MentorRecoveryPage } from "@/components/mentor/success/recovery-page";

export const metadata: Metadata = { title: "Recovery & escalations" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <MentorRecoveryPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
