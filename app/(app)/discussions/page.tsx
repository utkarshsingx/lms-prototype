import { Forum } from "@/components/discussions/forum";

export const metadata = { title: "Discussions" };

export default function DiscussionsPage() {
  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <Forum />
    </div>
  );
}
