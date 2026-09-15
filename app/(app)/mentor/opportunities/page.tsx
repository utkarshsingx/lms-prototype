import type { Metadata } from "next";
import { OpportunitiesPage } from "@/components/mentor/careers/opportunities-page";

export const metadata: Metadata = { title: "Jobs & internships" };

export default function Page() {
  return <OpportunitiesPage />;
}
