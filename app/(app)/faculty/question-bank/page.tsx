import type { Metadata } from "next";
import { QuestionBankPage } from "@/components/faculty/content/question-bank-page";

export const metadata: Metadata = { title: "Question bank" };

export default function Page() {
  return <QuestionBankPage />;
}
