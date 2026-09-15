import type { Metadata } from "next";

export const metadata: Metadata = { title: "UI kit" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
