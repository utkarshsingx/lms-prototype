import { Bot, CheckCheck, LifeBuoy, Siren, UserRound } from "lucide-react";
import { conversations } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { WhatsappInbox } from "@/components/channels/whatsapp-inbox";

const threads = conversations.filter((c) => c.channel === "whatsapp");
const needsPerson = threads.filter((c) => c.handledBy !== "human" && c.status === "escalated").length;
const withTeam = threads.filter((c) => c.handledBy === "human" && c.status !== "resolved").length;
const assistant = threads.filter((c) => c.handledBy === "bot" && c.status === "open").length;
const resolvedByAssistant = threads.filter((c) => c.handledBy === "bot" && c.status === "resolved").length;

export function WhatsappPage() {
  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student support"
        title="WhatsApp"
        sub="Watch the assistant answer learners on WhatsApp, take over a conversation when it needs a person, and hand it back when you are done."
        actions={
          <LinkButton href="/programme/support" variant="secondary">
            <LifeBuoy className="size-4" /> Support tickets
          </LinkButton>
        }
      />
      <KpiRow cols={4}>
        <KpiTile hero label="Needs a person" value={needsPerson} icon={<Siren />} sub="The assistant stepped back" />
        <KpiTile label="Assistant replying" value={assistant} tone="violet" icon={<Bot />} sub="Live now, watch or take over" />
        <KpiTile label="With the team" value={withTeam} tone="info" icon={<UserRound />} sub="A person is replying" />
        <KpiTile label="Resolved by the assistant" value={resolvedByAssistant} tone="jade" icon={<CheckCheck />} sub="No person needed" />
      </KpiRow>
      <WhatsappInbox />
    </div>
  );
}
