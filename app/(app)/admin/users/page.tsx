import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/core/users";

export const metadata: Metadata = { title: "Users & roles" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <AdminUsers initialTab={typeof tab === "string" ? tab : undefined} />;
}
