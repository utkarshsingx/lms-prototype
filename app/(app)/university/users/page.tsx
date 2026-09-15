import type { Metadata } from "next";
import { UsersPage } from "@/components/university/engagement/users-page";

export const metadata: Metadata = { title: "University users" };

export default function Page() {
  return <UsersPage />;
}
