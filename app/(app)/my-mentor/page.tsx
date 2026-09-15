import type { Metadata } from "next";
import { MyMentorPage } from "@/components/student/help/my-mentor-page";

export const metadata: Metadata = { title: "Mentor support" };

export default function Page() {
  return <MyMentorPage />;
}
