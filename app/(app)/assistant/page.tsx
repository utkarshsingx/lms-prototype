import type { Metadata } from "next";
import { AssistantPage } from "@/components/assistant/assistant-page";

export const metadata: Metadata = { title: "AI tutor" };

export default function Page() {
  return <AssistantPage />;
}
