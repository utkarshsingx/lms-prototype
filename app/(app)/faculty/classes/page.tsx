import type { Metadata } from "next";
import { FacultyClassesPage } from "@/components/faculty/teaching/classes-page";

export const metadata: Metadata = { title: "Live classes" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { class: classId, tab } = await searchParams;
  return (
    <FacultyClassesPage
      initialClassId={typeof classId === "string" ? classId : undefined}
      initialTab={typeof tab === "string" ? tab : undefined}
    />
  );
}
