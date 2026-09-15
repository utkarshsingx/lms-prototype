import type { Metadata } from "next";
import { CommunityPage } from "@/components/discussions/community-page";

export const metadata: Metadata = { title: "Community" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { space } = await searchParams;
  return <CommunityPage initialSpace={Array.isArray(space) ? space[0] : space} />;
}
