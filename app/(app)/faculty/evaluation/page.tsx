import type { Metadata } from "next";
import { FacultyEvaluationPage } from "@/components/faculty/teaching/evaluation-page";

export const metadata: Metadata = { title: "Evaluation" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <FacultyEvaluationPage initialTab={typeof tab === "string" ? tab : undefined} />;
}
