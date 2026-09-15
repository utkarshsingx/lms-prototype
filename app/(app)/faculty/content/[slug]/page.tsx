import { notFound } from "next/navigation";
import { courseBySlug, courses } from "@/lib/data";
import { CourseBuilder } from "@/components/studio/builder";

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  return { title: course ? `${course.title} · Content studio` : "Content studio" };
}

export default async function PaperBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  return <CourseBuilder course={course} />;
}
