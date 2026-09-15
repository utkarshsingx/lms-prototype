import type { Metadata } from "next";
import { AdminUniversities } from "@/components/admin/core/universities";

export const metadata: Metadata = { title: "Universities" };

export default function Page() {
  return <AdminUniversities />;
}
