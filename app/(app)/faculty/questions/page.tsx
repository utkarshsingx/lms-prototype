import type { Metadata } from "next";
import { FacultyQuestionsPage } from "@/components/faculty/teaching/questions-page";

export const metadata: Metadata = { title: "Student questions" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <FacultyQuestionsPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
