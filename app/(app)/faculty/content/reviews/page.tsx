import type { Metadata } from "next";
import { ReviewsPage } from "@/components/faculty/content/reviews-page";

export const metadata: Metadata = { title: "Reviews & versions" };

export default function Page() {
  return <ReviewsPage />;
}
