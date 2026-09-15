import { redirect } from "next/navigation";
import { courses } from "@/lib/data";

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export default async function StudioCourseRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/faculty/content/${slug}`);
}
