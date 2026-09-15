import type { Metadata } from "next";
import { ContentStudioPage } from "@/components/faculty/content/studio-page";

export const metadata: Metadata = { title: "Content studio" };

export default function Page() {
  return <ContentStudioPage />;
}
