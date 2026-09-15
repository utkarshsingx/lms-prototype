"use client";

import { useState } from "react";
import { CalendarCheck, CalendarPlus, Clock3, RotateCcw, UserX } from "lucide-react";
import { ACCA_TODAY, daysBetween, examSessionById, formatAccaDate } from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Tabs } from "@/components/ui/tabs";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, useEditAccess } from "./common";
import { SEED_ATTEMPTS, SEED_BOOKINGS, SEED_REVISION_COHORTS, type AttemptRow, type BookingRow, type RevisionCohort } from "./exams-model";
import { BookingsTab } from "./exams-bookings";
import { ResultsTab } from "./exams-results";
import { AttemptsTab } from "./exams-attempts";
import { RevisionCohortsTab } from "./exams-cohorts";

const DEC = examSessionById("es-2026-dec")!;
const SEP = examSessionById("es-2026-sep")!;

export function ExamsPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:acca");
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState<BookingRow[]>(SEED_BOOKINGS);
  const [attempts, setAttempts] = useState<AttemptRow[]>(SEED_ATTEMPTS);
  const [cohorts, setCohorts] = useState<RevisionCohort[]>(SEED_REVISION_COHORTS);
  const [recordOpen, setRecordOpen] = useState(false);

  const decBooked = bookings.filter((b) => b.sessionId === DEC.id && b.status === "booked").length;
  const decUnbooked = bookings.filter((b) => b.sessionId === DEC.id && (b.status === "planned" || b.status === "not-booked")).length;
  const sepPending = attempts.filter((a) => a.sessionId === SEP.id && a.result === "pending").length;

  const failedOpen = (() => {
    const groups = new Map<string, AttemptRow[]>();
    for (const a of attempts) groups.set(`${a.studentId}-${a.paper}`, [...(groups.get(`${a.studentId}-${a.paper}`) ?? []), a]);
    return [...groups.values()].filter((list) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[sorted.length - 1].result === "failed" && !sorted.some((a) => a.result === "passed");
    }).length;
  })();

  const tabs = [
    { id: "bookings", label: "Track examination bookings", count: decUnbooked },
    { id: "results", label: "Upload or record ACCA results", count: sepPending },
    { id: "attempts", label: "Track paper attempts" },
    { id: "cohorts", label: "Create revision and reattempt cohorts", count: failedOpen },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="ACCA operations"
        title="Exams & results"
        sub="Track examination bookings for every session, record ACCA results when they are released and move failed papers into revision and reattempt cohorts."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ title: "Report queued: exam-cycle-dec-2026.csv", tone: "info" })}>
              Export exam cycle
            </Button>
            <GatedButton
              allowed={canEdit}
              reason={reason}
              onClick={() => {
                setTab("bookings");
                setRecordOpen(true);
              }}
            >
              <CalendarPlus className="size-4" /> Record booking
            </GatedButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Dec 2026 bookings"
          value={decBooked}
          icon={<CalendarCheck />}
          sub={`Early entry closes ${formatAccaDate(DEC.earlyEntryCloses!)} · ${daysBetween(ACCA_TODAY, DEC.earlyEntryCloses!)} days`}
        />
        <KpiTile
          label="Not yet booked for Dec 2026"
          value={decUnbooked}
          tone="amber"
          icon={<UserX />}
          sub={`Standard entry closes ${formatAccaDate(DEC.standardEntryCloses!)}`}
        />
        <KpiTile
          label="Sep 2026 results pending"
          value={sepPending}
          tone="info"
          icon={<Clock3 />}
          sub={`Due ${formatAccaDate(SEP.resultsDate)}`}
        />
        <KpiTile label="Failed papers without a pass" value={failedOpen} tone="rose" icon={<RotateCcw />} sub="Candidates for a reattempt cohort" />
      </KpiRow>

      <div className="space-y-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        {tab === "bookings" ? (
          <BookingsTab
            bookings={bookings}
            setBookings={setBookings}
            canEdit={canEdit}
            reason={reason}
            recordOpen={recordOpen}
            setRecordOpen={setRecordOpen}
          />
        ) : null}
        {tab === "results" ? (
          <ResultsTab attempts={attempts} setAttempts={setAttempts} canEdit={canEdit} reason={reason} persona={persona.name} />
        ) : null}
        {tab === "attempts" ? <AttemptsTab attempts={attempts} /> : null}
        {tab === "cohorts" ? (
          <RevisionCohortsTab attempts={attempts} cohorts={cohorts} setCohorts={setCohorts} canEdit={canEdit} reason={reason} />
        ) : null}
      </div>
    </div>
  );
}
