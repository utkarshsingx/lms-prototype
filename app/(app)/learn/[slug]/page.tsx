import { notFound } from "next/navigation";
import { courseBySlug, courses } from "@/lib/data";
import { Player } from "@/components/player/player";

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: courseBySlug(slug)?.title ?? "Learn" };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  return <Player course={course} />;
}
