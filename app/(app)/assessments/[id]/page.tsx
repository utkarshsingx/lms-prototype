import { notFound } from "next/navigation";
import {
  assessmentById,
  assessments,
  courseById,
  rubricById,
} from "@/lib/data";
import { AssessmentRunner } from "@/components/assessment/runner";

export async function generateStaticParams() {
  return assessments.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: assessmentById(id)?.title ?? "Assessment" };
}

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = assessmentById(id);
  if (!assessment) notFound();
  const course = courseById(assessment.courseId);

  return (
    <AssessmentRunner
      assessment={assessment}
      rubric={rubricById(assessment.rubricId)}
      courseTitle={course?.title ?? ""}
      courseSlug={course?.slug ?? ""}
      moduleTitles={course?.modules.map((m) => m.title)}
    />
  );
}
