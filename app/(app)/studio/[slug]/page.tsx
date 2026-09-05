import { notFound } from "next/navigation";
import { courseBySlug, courses } from "@/lib/data";
import { CourseBuilder } from "@/components/studio/builder";

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${courseBySlug(slug)?.title ?? "Course"} · Studio` };
}

export default async function StudioCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  return <CourseBuilder course={course} />;
}
