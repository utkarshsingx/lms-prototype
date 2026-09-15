import type { Metadata } from "next";
import { AdminProgrammes } from "@/components/admin/core/programmes";

export const metadata: Metadata = { title: "Programmes" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <AdminProgrammes initialTab={typeof tab === "string" ? tab : undefined} />;
}
