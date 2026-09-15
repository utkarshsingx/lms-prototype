"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarPlus, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACCA_TODAY,
  PAPER_CODES,
  blackoutOn,
  daysBetween,
  examFeeGBP,
  examSessionById,
  formatAccaDate,
  formatGBP,
  openEntryWindow,
  paperByCode,
  paperName,
  students as allStudents,
  type EntryWindow,
  type ExamBooking,
  type PaperCode,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, relativeDays } from "./common";
import { CBE_CENTRES, paperIndex, studentIndex, type BookingRow } from "./exams-model";

const SESSION_TABS = [
  { id: "es-2026-dec", label: "Dec 2026" },
  { id: "es-2027-mar", label: "Mar 2027" },
  { id: "es-2027-jun", label: "Jun 2027" },
  { id: "on-demand", label: "On-demand CBEs" },
];

const WINDOW_LABEL: Record<EntryWindow, string> = {
  early: "Early entry",
  standard: "Standard entry",
  late: "Late entry",
  "on-demand": "On demand",
};

function isOnDemand(paper: string) {
  return paperByCode(paper)?.examFormat === "on-demand";
}

export function BookingsTab({
  bookings,
  setBookings,
  canEdit,
  reason,
  recordOpen,
  setRecordOpen,
}: {
  bookings: BookingRow[];
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>;
  canEdit: boolean;
  reason?: string;
  recordOpen: boolean;
  setRecordOpen: (open: boolean) => void;
}) {
  const [sessionId, setSessionId] = useState("es-2026-dec");
  const [statusFilter, setStatusFilter] = useState("");
  const [rebooking, setRebooking] = useState<BookingRow | null>(null);

  // Record booking drawer, controlled so on-demand and blackout warnings update live.
  const [formStudent, setFormStudent] = useState("s-sneha");
  const [formPaper, setFormPaper] = useState<PaperCode>("FR");
  const [formSession, setFormSession] = useState("es-2026-dec");
  const [formDate, setFormDate] = useState("2026-11-18");

  const session = examSessionById(sessionId);
  const inSession = useMemo(
    () => bookings.filter((b) => (sessionId === "on-demand" ? !b.sessionId : b.sessionId === sessionId)),
    [bookings, sessionId],
  );
  const unbooked = inSession.filter((b) => b.status === "planned" || b.status === "not-booked");
  const visible = statusFilter ? inSession.filter((b) => b.status === statusFilter) : inSession;

  const stats = {
    booked: inSession.filter((b) => b.status === "booked").length,
    planned: inSession.filter((b) => b.status === "planned").length,
    notBooked: inSession.filter((b) => b.status === "not-booked").length,
    feesPaid: inSession.filter((b) => b.feeStatus === "paid").reduce((s, b) => s + b.feeGBP, 0),
    warnings: inSession.filter((b) => b.blackoutWarning).length,
  };

  const windows = session
    ? ([
        ["early", session.earlyEntryCloses],
        ["standard", session.standardEntryCloses],
        ["late", session.lateEntryCloses],
      ] as [EntryWindow, string | undefined][]).filter((w): w is [EntryWindow, string] => Boolean(w[1]))
    : [];
  const openWindow = session ? openEntryWindow(session) : null;
  const standardClose = session?.standardEntryCloses;

  const markBooked = (ids: string[]) => {
    const target = bookings.filter((b) => ids.includes(b.id) && (b.status === "planned" || b.status === "not-booked"));
    if (!target.length) {
      toast({ title: "Nothing to book", body: "The selected rows are already booked.", tone: "info" });
      return;
    }
    setBookings((list) =>
      list.map((b) => {
        if (!target.some((t) => t.id === b.id)) return b;
        const s = b.sessionId ? examSessionById(b.sessionId) : undefined;
        const window = s ? (openEntryWindow(s) ?? b.entryWindow) : b.entryWindow;
        return { ...b, status: "booked", bookedOn: ACCA_TODAY, feeStatus: "paid", entryWindow: window, feeGBP: examFeeGBP(b.paper, window) };
      }),
    );
    toast({
      title: `${plural(target.length, "exam booking")} recorded`,
      body: target.map((t) => `${t.name} · ${t.paper}`).join(", "),
    });
  };

  const columns: DataTableColumn<BookingRow>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (b) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{b.name}</span>
          <span className="block font-mono text-[11.5px] text-ink-3">{b.accaId ?? "ACCA ID pending"}</span>
        </span>
      ),
    },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      sortValue: (b) => paperIndex(b.paper),
      render: (b) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{b.paper}</span>
          <span className="text-ink-3">{paperName(b.paper)}</span>
        </span>
      ),
    },
    {
      key: "date",
      header: sessionId === "on-demand" ? "Exam date" : "Entry window",
      sortable: true,
      render: (b) =>
        b.sessionId ? (
          <span className="block">
            <span className="block text-ink">{WINDOW_LABEL[b.entryWindow]}</span>
            {b.entryClosesOn ? <span className="block text-[12px] text-ink-3">closes {formatAccaDate(b.entryClosesOn)}</span> : null}
          </span>
        ) : (
          <span className="block">
            <span className="block text-ink">{formatAccaDate(b.date)}</span>
            {b.blackoutWarning ? (
              <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-rose">
                <AlertTriangle aria-hidden className="size-3.5" /> Inside university blackout
              </span>
            ) : (
              <span className="block text-[12px] text-ink-3">{relativeDays(b.date)}</span>
            )}
          </span>
        ),
    },
    {
      key: "status",
      header: "Booking",
      sortable: true,
      // Rows that need action first: blackout clashes, then unbooked, then booked.
      sortValue: (b) => (b.blackoutWarning ? -1 : ["not-booked", "planned", "booked", "sat", "cancelled"].indexOf(b.status)),
      render: (b) => <StatusPill status={b.status} />,
    },
    { key: "feeGBP", header: "Exam fee", align: "right", mono: true, sortable: true, render: (b) => formatGBP(b.feeGBP) },
    { key: "feeStatus", header: "Fee to ACCA", sortable: true, render: (b) => <StatusPill status={b.feeStatus} size="sm" /> },
    { key: "centre", header: "Centre", className: "text-ink-2" },
    { key: "bookedOn", header: "Booked on", sortable: true, render: (b) => (b.bookedOn ? formatAccaDate(b.bookedOn) : null) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (b) =>
        b.blackoutWarning ? (
          <GatedButton size="xs" variant="secondary" allowed={canEdit} reason={reason} onClick={() => setRebooking(b)}>
            Rebook
          </GatedButton>
        ) : b.status === "planned" || b.status === "not-booked" ? (
          <GatedButton size="xs" variant="outline" allowed={canEdit} reason={reason} onClick={() => markBooked([b.id])}>
            Mark booked
          </GatedButton>
        ) : null,
    },
  ];

  const formStudentRecord = studentIndex.get(formStudent);
  const formOnDemand = formSession === "on-demand";
  const formSessionRecord = formOnDemand ? undefined : examSessionById(formSession);
  const formWindow: EntryWindow = formOnDemand ? "on-demand" : ((formSessionRecord && openEntryWindow(formSessionRecord)) ?? "standard");
  const formatMismatch = formOnDemand ? !isOnDemand(formPaper) : isOnDemand(formPaper);
  const formBlackout =
    formOnDemand && formStudentRecord?.universityId ? blackoutOn(formStudentRecord.universityId, formDate) : undefined;
  const formFee = examFeeGBP(formPaper, formWindow);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={SESSION_TABS}
          value={sessionId}
          onChange={(id) => {
            setSessionId(id);
            setStatusFilter("");
          }}
        />
        <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={() => setRecordOpen(true)}>
          <CalendarPlus className="size-4" /> Record booking
        </GatedButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title={session ? `${session.label} entry windows` : "On-demand CBEs"}
            sub={
              session
                ? `Exams ${formatAccaDate(session.examStart)} to ${formatAccaDate(session.examEnd)} · results ${formatAccaDate(session.resultsDate)}`
                : "BT, MA, FA and LW can be booked for any date. Bookings inside a university examination blackout are warned."
            }
            action={session ? <StatusPill status={session.statusLabel} tone={session.status === "entry-open" ? "jade" : "neutral"} /> : null}
          />
          <div className="px-5 pb-5">
            {session ? (
              <ol className="space-y-2">
                {windows.map(([w, closes]) => {
                  const days = daysBetween(ACCA_TODAY, closes);
                  const closed = days < 0;
                  const open = openWindow === w;
                  return (
                    <li
                      key={w}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3.5 py-2.5",
                        open ? "border-ink bg-cta-soft" : "border-line",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{WINDOW_LABEL[w]}</span>
                        <span className="block text-[12px] text-ink-3">closes {formatAccaDate(closes)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {open ? <StatusPill status="Open now" tone="jade" size="sm" /> : null}
                        <span className={cn("font-display text-[20px] leading-none font-bold tnum", closed ? "text-ink-3" : "text-ink")}>
                          {closed ? "Closed" : `${days} days`}
                        </span>
                      </span>
                    </li>
                  );
                })}
                {session.status === "entry-not-open" ? (
                  <li className="text-[12.5px] text-ink-3">Entry is not open yet. Plan bookings now and remind learners when it opens.</li>
                ) : null}
              </ol>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[var(--radius-md)] border border-line p-3">
                  <MiniLabel>Upcoming bookings</MiniLabel>
                  <p className="mt-1.5 font-display text-[24px] leading-none font-bold text-ink tnum">{stats.booked}</p>
                </div>
                <div className={cn("rounded-[var(--radius-md)] border p-3", stats.warnings ? "border-rose/40 bg-rose-soft" : "border-line")}>
                  <MiniLabel>Blackout warnings</MiniLabel>
                  <p className="mt-1.5 font-display text-[24px] leading-none font-bold text-ink tnum">{stats.warnings}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Unbooked eligible learners"
            sub={
              standardClose
                ? `Standard entry closes ${formatAccaDate(standardClose)} (${relativeDays(standardClose)}).`
                : "Planned on-demand exams without a confirmed slot."
            }
          />
          <div className="px-5 pb-5">
            {unbooked.length ? (
              <DataTable
                bare
                dense
                pageSize={5}
                caption="Unbooked eligible learners"
                rows={unbooked}
                getRowId={(b) => b.id}
                columns={[
                  { key: "name", header: "Learner", sortable: true, className: "font-semibold" },
                  { key: "paper", header: "Paper", mono: true },
                  { key: "status", header: "Status", render: (b) => <StatusPill status={b.status} size="sm" /> },
                  {
                    key: "fee",
                    header: "Fee now",
                    align: "right",
                    mono: true,
                    render: (b) => {
                      const s = b.sessionId ? examSessionById(b.sessionId) : undefined;
                      return formatGBP(examFeeGBP(b.paper, (s && openEntryWindow(s)) ?? b.entryWindow));
                    },
                  },
                ]}
                selectable
                bulkActions={(ids, clear) => (
                  <>
                    <GatedButton
                      size="sm"
                      allowed={canEdit}
                      reason={reason}
                      onClick={() => {
                        toast({
                          title: `Booking reminder sent to ${plural(ids.length, "learner")}`,
                          body: standardClose ? `Book before ${formatAccaDate(standardClose)} · email and WhatsApp` : "Email and WhatsApp",
                        });
                        clear();
                      }}
                    >
                      <Send className="size-3.5" /> Send reminder
                    </GatedButton>
                    <GatedButton
                      size="sm"
                      variant="inverse"
                      allowed={canEdit}
                      reason={reason}
                      onClick={() => {
                        markBooked(ids);
                        clear();
                      }}
                    >
                      Mark booked
                    </GatedButton>
                  </>
                )}
              />
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-3">
                Every eligible learner has booked.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Booked", stats.booked],
          ["Planned", stats.planned],
          ["Not booked", stats.notBooked],
          ["Exam fees paid to ACCA", formatGBP(stats.feesPaid)],
        ].map(([label, value]) => (
          <Card key={label as string} className="min-w-0 p-4">
            <MiniLabel>{label}</MiniLabel>
            <p className="mt-2 font-display text-[24px] leading-none font-bold text-ink tnum">{value}</p>
          </Card>
        ))}
      </div>

      <DataTable
        caption="Examination bookings"
        rows={visible}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ key: "status", dir: "asc" }}
        search={{
          placeholder: "Search learner, ACCA ID or paper",
          match: (b, q) => b.name.toLowerCase().includes(q) || (b.accaId ?? "").includes(q) || b.paper.toLowerCase() === q,
        }}
        filters={
          <FilterSelect
            label="Booking"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All"
            options={[
              { value: "booked", label: "Booked" },
              { value: "planned", label: "Planned" },
              { value: "not-booked", label: "Not booked" },
            ]}
          />
        }
        toolbar={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toast({ title: `Report queued: exam-bookings-${sessionId === "on-demand" ? "on-demand" : session?.label.toLowerCase().replace(" ", "-")}.csv`, tone: "info" })}
          >
            Export
          </Button>
        }
      />

      {/* ---------------------------------------------------------- rebook */}
      <FormDrawer
        open={rebooking !== null}
        onClose={() => setRebooking(null)}
        title="Rebook on-demand exam"
        sub={rebooking ? `${rebooking.name} · ${rebooking.paper} · currently ${formatAccaDate(rebooking.date)}` : undefined}
        submitLabel="Save new date"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          if (!rebooking) return;
          const date = String(data.get("date") || "");
          if (!date || date <= ACCA_TODAY) {
            toast({ title: "Choose a future date", tone: "warning" });
            return;
          }
          const clash = rebooking.universityId ? blackoutOn(rebooking.universityId, date) : undefined;
          if (clash) {
            toast({ title: "That date is still inside the blackout", body: `${clash.label} · ${formatAccaDate(clash.start)} to ${formatAccaDate(clash.end)}`, tone: "warning" });
            return;
          }
          setBookings((list) =>
            list.map((b) => (b.id === rebooking.id ? { ...b, date, label: formatAccaDate(date), blackoutWarning: undefined } : b)),
          );
          toast({ title: "Exam rebooked", body: `${rebooking.name} · ${rebooking.paper} on ${formatAccaDate(date)}` });
          setRebooking(null);
        }}
      >
        {rebooking?.blackoutWarning ? (
          <Note tone="rose" icon={<AlertTriangle />}>
            {rebooking.blackoutWarning}
          </Note>
        ) : null}
        <Field label="New exam date" hint="On-demand CBE">
          <Input key={rebooking?.id} type="date" name="date" defaultValue="2026-11-19" min="2026-09-15" />
        </Field>
        <Field label="Centre">
          <Select name="centre" defaultValue={rebooking?.centre}>
            {CBE_CENTRES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </FormDrawer>

      {/* ---------------------------------------------------------- record booking */}
      <FormDrawer
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record exam booking"
        sub="Learners book in myACCA. Record the confirmation here so the team can track it."
        submitLabel="Record booking"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const s = studentIndex.get(formStudent);
          if (!s) return;
          if (formatMismatch) {
            toast({
              title: formOnDemand ? `${formPaper} is a session CBE` : `${formPaper} is an on-demand CBE`,
              body: formOnDemand ? "Choose an exam session instead." : "Choose On-demand and a date instead.",
              tone: "warning",
            });
            return;
          }
          const status = String(data.get("status")) as ExamBooking["status"];
          const paid = data.get("paid") === "on";
          const row: BookingRow = {
            id: `eb-new-${s.id}-${formPaper.toLowerCase()}-${bookings.length}`,
            studentId: s.id,
            name: s.name,
            accaId: s.accaId,
            universityId: s.universityId,
            paper: formPaper,
            sessionId: formOnDemand ? undefined : (formSession as ExamBooking["sessionId"]),
            date: formOnDemand ? formDate : (formSessionRecord?.examStart ?? formDate),
            label: formOnDemand ? formatAccaDate(formDate) : (formSessionRecord?.label ?? ""),
            entryWindow: formWindow,
            entryClosesOn: formOnDemand ? undefined : formSessionRecord?.earlyEntryCloses ?? formSessionRecord?.standardEntryCloses,
            status,
            bookedOn: status === "booked" ? ACCA_TODAY : undefined,
            feeGBP: formFee,
            feeStatus: paid ? "paid" : "unpaid",
            centre: String(data.get("centre")),
            blackoutWarning: formBlackout
              ? `Falls inside ${formBlackout.reason} (${formatAccaDate(formBlackout.start)} to ${formatAccaDate(formBlackout.end)}). Rebook before ${formatAccaDate(formBlackout.start)}.`
              : undefined,
          };
          // A planned or unbooked row for the same learner, paper and session becomes this booking.
          const existing = bookings.find(
            (b) =>
              b.studentId === s.id &&
              b.paper === formPaper &&
              (formOnDemand ? !b.sessionId : b.sessionId === formSession) &&
              (b.status === "planned" || b.status === "not-booked"),
          );
          setBookings((list) => (existing ? list.map((b) => (b.id === existing.id ? { ...row, id: existing.id } : b)) : [row, ...list]));
          setSessionId(formOnDemand ? "on-demand" : formSession);
          toast({
            title: "Exam booking recorded",
            body: `${s.name} · ${formPaper} · ${row.label}`,
            tone: formBlackout ? "warning" : "success",
          });
          setRecordOpen(false);
        }}
      >
        <Field label="Learner">
          <Select value={formStudent} onChange={(e) => setFormStudent(e.target.value)}>
            {allStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.accaId ? ` · ${s.accaId}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select
              value={formPaper}
              onChange={(e) => {
                const p = e.target.value as PaperCode;
                setFormPaper(p);
                if (isOnDemand(p)) setFormSession("on-demand");
                else if (formSession === "on-demand") setFormSession("es-2026-dec");
              }}
            >
              {PAPER_CODES.map((p) => (
                <option key={p} value={p}>
                  {p} · {paperName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam session">
            <Select value={formSession} onChange={(e) => setFormSession(e.target.value)}>
              {SESSION_TABS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {formOnDemand ? (
          <Field label="Exam date">
            <Input type="date" value={formDate} min="2026-09-15" onChange={(e) => setFormDate(e.target.value)} />
          </Field>
        ) : null}
        {formatMismatch ? (
          <Note tone="amber" icon={<CalendarClock />}>
            {formOnDemand
              ? `${formPaper} is sat in the March, June, September and December sessions, not on demand.`
              : `${formPaper} is an on-demand CBE. Choose On-demand CBEs and a date.`}
          </Note>
        ) : null}
        {formBlackout ? (
          <Note tone="rose" icon={<AlertTriangle />}>
            {formatAccaDate(formDate)} is inside {formBlackout.reason} ({formatAccaDate(formBlackout.start)} to{" "}
            {formatAccaDate(formBlackout.end)}). The booking will be saved with a blackout warning.
          </Note>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Booking status">
            <Select name="status" defaultValue="booked">
              <option value="booked">Booked</option>
              <option value="planned">Planned</option>
            </Select>
          </Field>
          <Field label="Centre">
            <Select name="centre" defaultValue={CBE_CENTRES[0]}>
              {CBE_CENTRES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink-2">
            {WINDOW_LABEL[formWindow]} fee · paid to ACCA
          </span>
          <span className="font-mono text-[14px] font-semibold text-ink tnum">{formatGBP(formFee)}</span>
        </div>
        <Checkbox name="paid" defaultChecked label="Exam fee paid by the learner" />
      </FormDrawer>
    </div>
  );
}
