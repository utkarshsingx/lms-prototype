import type { Metadata } from "next";
import { PapersPage } from "@/components/student/learn/papers-page";

export const metadata: Metadata = { title: "Papers" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <PapersPage initialPaper={one(q.paper)} initialTab={one(q.tab)} />;
}
