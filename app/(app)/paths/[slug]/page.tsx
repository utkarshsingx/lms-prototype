import { redirect } from "next/navigation";
import { paths } from "@/lib/data";

export async function generateStaticParams() {
  return paths.map((p) => ({ slug: p.slug }));
}

export default function PathRedirect() {
  redirect("/journey");
}
