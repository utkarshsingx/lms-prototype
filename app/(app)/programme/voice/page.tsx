import type { Metadata } from "next";
import { VoicePage } from "@/components/programme/support/voice-page";

export const metadata: Metadata = { title: "Voice agent" };

export default function Page() {
  return <VoicePage />;
}
