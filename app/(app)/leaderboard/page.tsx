import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/student/journeys/leaderboard-page";

export const metadata: Metadata = { title: "Cohort leaderboard" };

export default function Page() {
  return <LeaderboardPage />;
}
