"use client";

import { useState } from "react";
import { Award, Layers, Megaphone, Plus, TriangleAlert } from "lucide-react";
import { cohorts, students as allStudents, universityAnnouncements, universityById, type Announcement } from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Tabs } from "@/components/ui/tabs";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { GatedButton, useEditAccess } from "../acca/common";
import { UniversityPicker, UniversityStrip } from "./common";
import { AnnouncementsTab } from "./ops-announcements";
import { ReportsTab, SEED_RUNS, type ReportRun } from "./ops-reports";
import { BatchesTab } from "./ops-batches";
import { JointCertTab, SEED_VERIFICATION, type Verification } from "./ops-joint-cert";

export function OperationsPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:universities");
  const [uniId, setUniId] = useState("u-brightwater");
  const [tab, setTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>(universityAnnouncements);
  const [runs, setRuns] = useState<ReportRun[]>(SEED_RUNS);
  const [verification, setVerification] = useState<Record<string, Verification>>(SEED_VERIFICATION);

  const university = universityById(uniId)!;
  const uniAnnouncements = announcements.filter((a) => a.audienceId === uniId);
  const setUniAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>> = (action) =>
    setAnnouncements((all) => {
      const current = all.filter((a) => a.audienceId === uniId);
      const next = typeof action === "function" ? action(current) : action;
      return [...next, ...all.filter((a) => a.audienceId !== uniId)];
    });

  const sections = cohorts.filter((c) => c.universityId === uniId).reduce((s, c) => s + c.sections.length, 0);
  const pendingVerification = allStudents.filter((s) => s.universityId === uniId && verification[s.id] === "pending").length;

  const tabs = [
    { id: "announcements", label: "Create university-specific announcements", count: uniAnnouncements.filter((a) => a.status !== "published").length },
    { id: "reports", label: "Generate university reports" },
    { id: "batches", label: "Monitor university batches", count: sections },
    { id: "joint", label: "Coordinate joint certification" },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="University coordination"
        title="University operations"
        sub="Announcements, reports, batch monitoring and joint certification for each partner university, in one place."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <GatedButton allowed={canEdit} reason={reason} onClick={() => setTab("announcements")}>
            <Plus className="size-4" /> New announcement
          </GatedButton>
        }
      />

      <UniversityPicker value={uniId} onChange={setUniId} />
      <UniversityStrip university={university} />

      <KpiRow cols={4}>
        <KpiTile hero label="Learners" value={university.headline.students} icon={<Layers />} sub={`${university.headline.activeCohorts} cohorts · ${sections} batches`} />
        <KpiTile label="At risk" value={university.headline.atRisk} tone="rose" icon={<TriangleAlert />} sub={`average readiness ${university.headline.avgReadiness || "not yet measured"}`} />
        <KpiTile
          label="Announcements"
          value={uniAnnouncements.length}
          tone="info"
          icon={<Megaphone />}
          sub={`${uniAnnouncements.filter((a) => a.status === "scheduled").length} scheduled · ${uniAnnouncements.filter((a) => a.status === "draft").length} draft`}
        />
        <KpiTile
          label="Joint certificate on track"
          value={`${university.headline.jointCertOnTrackPct}%`}
          tone="jade"
          icon={<Award />}
          sub={`${pendingVerification} pending university verification`}
        />
      </KpiRow>

      <div className="space-y-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        {tab === "announcements" ? (
          <AnnouncementsTab
            key={uniId}
            university={university}
            items={uniAnnouncements}
            setItems={setUniAnnouncements}
            canEdit={canEdit}
            reason={reason}
            persona={persona}
          />
        ) : null}
        {tab === "reports" ? <ReportsTab key={uniId} university={university} runs={runs} setRuns={setRuns} persona={persona.name} /> : null}
        {tab === "batches" ? <BatchesTab key={uniId} university={university} canEdit={canEdit} reason={reason} /> : null}
        {tab === "joint" ? (
          <JointCertTab key={uniId} university={university} verification={verification} setVerification={setVerification} canEdit={canEdit} reason={reason} />
        ) : null}
      </div>
    </div>
  );
}
