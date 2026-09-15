import type { Metadata } from "next";
import { PracticePage } from "@/components/student/learn/practice-page";

export const metadata: Metadata = { title: "Practice" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <PracticePage initialPaper={one(q.paper)} initialArea={one(q.area)} />;
}
