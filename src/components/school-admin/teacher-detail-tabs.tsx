"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Home,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  passivateTeachingAssignmentAction,
  saveCourseTeacherAssignmentAction,
  saveHomeroomTeacherAssignmentAction,
} from "@/app/(school-admin)/teachers/actions";
import type { TeachingState } from "@/lib/teaching-validation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dock, type DockItemData } from "@/components/ui/dock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { HTML_LOCALES, type Locale } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { PersonAccountPanel } from "./person-account-panel";

type TeacherMessages = Pick<AppDictionary, "common" | "staff">;
type StaffMessages = TeacherMessages["staff"];
type TeacherDetailTab = "summary" | "homeroom" | "courses" | "schedule" | "account";

type TimetableWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY";

type SchedulePeriodOption = {
  id: string;
  label: string;
  sequence: number;
  startTime: string;
  endTime: string;
};

type TimetableParticipantRow = {
  id: string;
  revision: string;
  courseTeacherAssignmentId: string;
  courseOfferingId: string;
  classLabel: string;
  subjectName: string;
  track: string;
  status: "ACTIVE" | "PASSIVE";
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
};

type TimetableSessionRow = {
  id: string;
  weekday: TimetableWeekday;
  schedulePeriodId: string;
  periodLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  participants: TimetableParticipantRow[];
};

type TeacherDetail = {
  id: string;
  employmentId: string;
  personId: string;
  staffNumber: string;
  fullName: string;
  photoUrl: string | null;
  title: string;
  category: "CLASSROOM" | "BRANCH";
  status: "ACTIVE" | "INACTIVE";
  employmentStatus: string;
  department: string;
  position: string;
  phone: string | null;
  email: string | null;
  subjects: { id: string; name: string }[];
  teacherAccount: {
    id: string;
    username: string | null;
    status: string;
    mustChangePassword: boolean;
    suspendedAt: string | null;
  } | null;
  activeYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  classSections: {
    id: string;
    label: string;
    activeTeacherProfileId: string | null;
    activeTeacherName: string | null;
  }[];
  courseOfferings: {
    id: string;
    label: string;
    classLabel: string;
    subjectName: string;
    track: string;
    activeTeacherProfileId: string | null;
    activeTeacherName: string | null;
  }[];
  homeroomAssignments: AssignmentRow[];
  courseAssignments: (AssignmentRow & {
    courseOfferingId: string;
    subjectName: string;
    track: string;
  })[];
  weeklySchedule: {
    weekdays: TimetableWeekday[];
    periods: SchedulePeriodOption[];
    sessions: TimetableSessionRow[];
  };
};

type AssignmentRow = {
  id: string;
  revision: string;
  status: "ACTIVE" | "PASSIVE";
  classLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
};

function teacherTabHref(teacherProfileId: string, tab: TeacherDetailTab) {
  return `/teachers/${teacherProfileId}?tab=${tab}`;
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase();
}

function weekdayFromDate(value: string): TimetableWeekday | null {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  if (day === 1) return "MONDAY";
  if (day === 2) return "TUESDAY";
  if (day === 3) return "WEDNESDAY";
  if (day === 4) return "THURSDAY";
  if (day === 5) return "FRIDAY";
  return null;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function periodTitle(period: SchedulePeriodOption) {
  return period.label.replace(/\s*\(\d{2}:\d{2}[–-]\d{2}:\d{2}\)$/, "");
}

function useCloseOnSuccess(
  state: TeachingState,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
    setOpen(false);
  }, [setOpen, state.message, state.status]);
}

function ActionAlert({ state }: { state: TeachingState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert
      role={state.status === "error" ? "alert" : "status"}
      variant={state.status === "error" ? "danger" : "success"}
    >
      {state.message}
    </Alert>
  );
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <p className="truncate text-lg font-semibold text-foreground">{value}</p>
        {note ? <p className="truncate text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function assignmentStatusBadge(status: AssignmentRow["status"], messages: StaffMessages) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "outline"}>
      {status === "ACTIVE"
        ? messages.activeAssignment
        : messages.passiveAssignment}
    </Badge>
  );
}

function trackLabel(track: string, messages: StaffMessages) {
  if (track === "ELECTIVE") return messages.subjectTrackElective;
  if (track === "IGCSE") return messages.subjectTrackIgcse;
  return messages.subjectTrackGeneral;
}

function weekdayLabel(weekday: TimetableWeekday, messages: StaffMessages) {
  if (weekday === "MONDAY") return messages.weekdayMonday;
  if (weekday === "TUESDAY") return messages.weekdayTuesday;
  if (weekday === "WEDNESDAY") return messages.weekdayWednesday;
  if (weekday === "THURSDAY") return messages.weekdayThursday;
  return messages.weekdayFriday;
}

function AssignmentTransitionDialog({
  assignmentKind,
  assignment,
  detailTeacherProfileId,
  defaultEffectiveOn,
  messages,
}: {
  assignmentKind: "homeroom" | "course";
  assignment: AssignmentRow;
  detailTeacherProfileId: string;
  defaultEffectiveOn: string;
  messages: TeacherMessages;
}) {
  if (assignment.status !== "ACTIVE") return null;
  return (
    <AssignmentTransitionDialogContent
      assignmentKind={assignmentKind}
      assignment={assignment}
      detailTeacherProfileId={detailTeacherProfileId}
      defaultEffectiveOn={defaultEffectiveOn}
      messages={messages}
    />
  );
}

function AssignmentTransitionDialogContent({
  assignmentKind,
  assignment,
  detailTeacherProfileId,
  defaultEffectiveOn,
  messages,
}: {
  assignmentKind: "homeroom" | "course";
  assignment: AssignmentRow;
  detailTeacherProfileId: string;
  defaultEffectiveOn: string;
  messages: TeacherMessages;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeachingState, FormData>(
    passivateTeachingAssignmentAction,
    {},
  );
  useCloseOnSuccess(state, setOpen);
  const text = messages.staff;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="xs" variant="outline">
          {text.passivateAssignment}
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle>{text.passivateAssignment}</DialogTitle>
            <DialogDescription>
              {assignment.classLabel} · {text.effectiveRange}: {assignment.effectiveFrom}
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <input
              type="hidden"
              name="detailTeacherProfileId"
              value={detailTeacherProfileId}
            />
            <input type="hidden" name="assignmentKind" value={assignmentKind} />
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <input type="hidden" name="revision" value={assignment.revision} />
            <div className="space-y-1.5">
              <Label htmlFor={`${assignmentKind}-${assignment.id}-effectiveOn`}>
                {text.passivateOn}
              </Label>
              <Input
                id={`${assignmentKind}-${assignment.id}-effectiveOn`}
                name="effectiveOn"
                type="date"
                defaultValue={defaultEffectiveOn}
                min={assignment.effectiveFrom}
                disabled={pending}
                required
              />
            </div>
            <ActionAlert state={state} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {messages.common.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? messages.common.processing : text.passivateAssignment}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function HomeroomTab({
  teacher,
  defaultEffectiveOn,
  canManageAssignments,
  messages,
}: {
  teacher: TeacherDetail;
  defaultEffectiveOn: string;
  canManageAssignments: boolean;
  messages: TeacherMessages;
}) {
  const text = messages.staff;
  const [open, setOpen] = useState(false);
  const [createState, createAction, createPending] = useActionState<
    TeachingState,
    FormData
  >(saveHomeroomTeacherAssignmentAction, {});
  useCloseOnSuccess(createState, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.homeroomAssignments}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{text.homeroomHelp}</p>
            </div>
            {canManageAssignments ? (
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  disabled={!teacher.activeYear || teacher.classSections.length === 0}
                >
                  <Plus aria-hidden />
                  {text.addAssignment}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!teacher.activeYear ? (
            <div className="p-4">
              <Alert variant="warning">{text.noActiveAcademicYear}</Alert>
            </div>
          ) : teacher.homeroomAssignments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {text.noHomeroomAssignments}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="text-[11px]">
                  <TableRow>
                    <TableHead className="h-8 px-3">{text.classSectionColumn}</TableHead>
                    <TableHead className="h-8 px-3">{text.effectiveRange}</TableHead>
                    <TableHead className="h-8 px-3">{text.assignmentStatus}</TableHead>
                    <TableHead className="h-8 px-3">{text.note}</TableHead>
                    <TableHead className="h-8 px-3 text-right">{text.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.homeroomAssignments.map((assignment, index) => (
                    <TableRow key={assignment.id} className={index % 2 ? "bg-muted/45" : undefined}>
                      <TableCell className="px-3 py-2 font-medium">{assignment.classLabel}</TableCell>
                      <TableCell className="px-3 py-2">
                        {assignment.effectiveFrom}
                        {assignment.effectiveTo ? ` → ${assignment.effectiveTo}` : ""}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {assignmentStatusBadge(assignment.status, text)}
                      </TableCell>
                      <TableCell className="max-w-56 px-3 py-2 text-muted-foreground">
                        {assignment.note ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        {canManageAssignments ? (
                          <AssignmentTransitionDialog
                            assignmentKind="homeroom"
                            assignment={assignment}
                            detailTeacherProfileId={teacher.id}
                            defaultEffectiveOn={defaultEffectiveOn}
                            messages={messages}
                          />
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {open ? (
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle>{text.assignHomeroom}</DialogTitle>
            <DialogDescription>{text.homeroomHelp}</DialogDescription>
          </DialogHeader>
          <form action={createAction} className="space-y-4">
            <input type="hidden" name="teacherProfileId" value={teacher.id} />
            <div className="space-y-1.5">
              <Label htmlFor="academicYearClassSectionId">{text.selectClassSection}</Label>
              <NativeSelect
                id="academicYearClassSectionId"
                name="academicYearClassSectionId"
                disabled={createPending}
                required
              >
                <option value="">{text.selectClassSection}</option>
                {teacher.classSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                    {section.activeTeacherName
                      ? section.activeTeacherProfileId === teacher.id
                        ? ` · ${text.alreadyAssignedToThisTeacher}`
                        : ` · ${text.assignedTo}: ${section.activeTeacherName}`
                      : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="homeroomEffectiveFrom">{text.effectiveDate}</Label>
              <Input
                id="homeroomEffectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={defaultEffectiveOn}
                min={teacher.activeYear?.startDate}
                max={teacher.activeYear?.endDate}
                disabled={createPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="homeroomNote">{text.assignmentNote}</Label>
              <Textarea id="homeroomNote" name="note" rows={3} disabled={createPending} />
            </div>
            <ActionAlert state={createState} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createPending}>
                {messages.common.cancel}
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending ? messages.common.processing : text.saveAssignment}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function CourseAssignmentsTab({
  teacher,
  defaultEffectiveOn,
  canManageAssignments,
  messages,
}: {
  teacher: TeacherDetail;
  defaultEffectiveOn: string;
  canManageAssignments: boolean;
  messages: TeacherMessages;
}) {
  const text = messages.staff;
  const [open, setOpen] = useState(false);
  const [createState, createAction, createPending] = useActionState<
    TeachingState,
    FormData
  >(saveCourseTeacherAssignmentAction, {});
  useCloseOnSuccess(createState, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{text.courseAssignments}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{text.courseAssignmentsHelp}</p>
            </div>
            {canManageAssignments ? (
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  disabled={!teacher.activeYear || teacher.courseOfferings.length === 0}
                >
                  <Plus aria-hidden />
                  {text.addAssignment}
                </Button>
              </DialogTrigger>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!teacher.activeYear ? (
            <div className="p-4">
              <Alert variant="warning">{text.noActiveAcademicYear}</Alert>
            </div>
          ) : teacher.courseAssignments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{text.noCourseAssignments}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="text-[11px]">
                  <TableRow>
                    <TableHead className="h-8 px-3">{text.classSectionColumn}</TableHead>
                    <TableHead className="h-8 px-3">{text.courseColumn}</TableHead>
                    <TableHead className="h-8 px-3">{text.effectiveRange}</TableHead>
                    <TableHead className="h-8 px-3">{text.assignmentStatus}</TableHead>
                    <TableHead className="h-8 px-3 text-right">{text.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.courseAssignments.map((assignment, index) => (
                    <TableRow key={assignment.id} className={index % 2 ? "bg-muted/45" : undefined}>
                      <TableCell className="px-3 py-2">{assignment.classLabel}</TableCell>
                      <TableCell className="px-3 py-2 font-medium">
                        {assignment.subjectName}
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {trackLabel(assignment.track, text)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {assignment.effectiveFrom}
                        {assignment.effectiveTo ? ` → ${assignment.effectiveTo}` : ""}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {assignmentStatusBadge(assignment.status, text)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        {canManageAssignments ? (
                          <AssignmentTransitionDialog
                            assignmentKind="course"
                            assignment={assignment}
                            detailTeacherProfileId={teacher.id}
                            defaultEffectiveOn={defaultEffectiveOn}
                            messages={messages}
                          />
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {open ? (
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle>{text.assignCourseTeacher}</DialogTitle>
            <DialogDescription>{text.courseAssignmentsHelp}</DialogDescription>
          </DialogHeader>
          <form action={createAction} className="space-y-4">
            <input type="hidden" name="teacherProfileId" value={teacher.id} />
            <div className="space-y-1.5">
              <Label htmlFor="courseOfferingId">{text.selectCourseOffering}</Label>
              <NativeSelect id="courseOfferingId" name="courseOfferingId" disabled={createPending} required>
                <option value="">{text.selectCourseOffering}</option>
                {teacher.courseOfferings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.label} · {trackLabel(offering.track, text)}
                    {offering.activeTeacherName
                      ? offering.activeTeacherProfileId === teacher.id
                        ? ` · ${text.alreadyAssignedToThisTeacher}`
                        : ` · ${text.assignedTo}: ${offering.activeTeacherName}`
                      : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseEffectiveFrom">{text.effectiveDate}</Label>
              <Input
                id="courseEffectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={defaultEffectiveOn}
                min={teacher.activeYear?.startDate}
                max={teacher.activeYear?.endDate}
                disabled={createPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseNote">{text.assignmentNote}</Label>
              <Textarea id="courseNote" name="note" rows={3} disabled={createPending} />
            </div>
            <ActionAlert state={createState} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createPending}>
                {messages.common.cancel}
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending ? messages.common.processing : text.saveAssignment}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function WeeklyScheduleTab({
  teacher,
  initialDay,
  messages,
}: {
  teacher: TeacherDetail;
  initialDay: TimetableWeekday | null;
  messages: StaffMessages;
}) {
  const [selectedDay, setSelectedDay] = useState<TimetableWeekday>(
    initialDay ?? teacher.weeklySchedule.weekdays[0] ?? "MONDAY",
  );
  const sessionsBySlot = useMemo(() => {
    const slots = new Map<string, TimetableSessionRow[]>();
    for (const session of teacher.weeklySchedule.sessions) {
      const key = `${session.weekday}:${session.schedulePeriodId}`;
      const sessions = slots.get(key) ?? [];
      sessions.push(session);
      slots.set(key, sessions);
    }
    return slots;
  }, [teacher.weeklySchedule.sessions]);
  const mobileLessons = teacher.weeklySchedule.periods.flatMap((period) =>
    (sessionsBySlot.get(`${selectedDay}:${period.id}`) ?? []).map((session) => ({
      period,
      session,
    })),
  );

  return (
      <Card size="sm">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{messages.weeklyScheduleGridTitle}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {messages.weeklyScheduleDescription}
              </p>
            </div>
            <Badge variant="outline">
              {formatMessage(messages.lessonCount, {
                count: teacher.weeklySchedule.sessions.reduce(
                  (count, session) => count + session.participants.length,
                  0,
                ),
              })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {teacher.weeklySchedule.periods.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {messages.noWeeklySchedule}
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[880px] table-fixed text-[11px]">
                  <TableHeader className="bg-muted/35">
                    <TableRow>
                      <TableHead className="h-9 w-36 px-3">
                        {messages.schedulePeriodColumn}
                      </TableHead>
                      {teacher.weeklySchedule.weekdays.map((weekday) => (
                        <TableHead key={weekday} className="h-9 px-2 text-center">
                          {weekdayLabel(weekday, messages)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacher.weeklySchedule.periods.map((period, periodIndex) => (
                      <TableRow key={period.id} className={periodIndex % 2 ? "bg-muted/30" : undefined}>
                        <TableCell className="px-3 py-2 align-top">
                          <p className="font-semibold text-foreground">
                            {periodTitle(period)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {period.startTime}–{period.endTime}
                          </p>
                        </TableCell>
                        {teacher.weeklySchedule.weekdays.map((weekday) => {
                          const sessions = sessionsBySlot.get(`${weekday}:${period.id}`) ?? [];
                          return (
                            <TableCell key={`${weekday}-${period.id}`} className="px-1.5 py-1.5 align-top">
                              {sessions.length === 0 ? (
                                <span className="block py-2 text-center text-muted-foreground/60">—</span>
                              ) : (
                                <div className="space-y-1">
                                  {sessions.flatMap((session) =>
                                    session.participants.map((participant) => (
                                      <div key={participant.id} className="rounded-md bg-primary/7 px-2 py-1.5 ring-1 ring-primary/10">
                                        <p className="font-semibold text-foreground">{participant.subjectName}</p>
                                        <p className="mt-0.5 text-[10px] text-muted-foreground">{participant.classLabel}</p>
                                      </div>
                                    )),
                                  )}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                <div
                  className="grid grid-cols-5 gap-1 rounded-lg bg-muted/55 p-1"
                  role="group"
                  aria-label={messages.scheduleDayPickerLabel}
                >
                  {teacher.weeklySchedule.weekdays.map((weekday) => (
                    <button
                      key={weekday}
                      type="button"
                      aria-label={weekdayLabel(weekday, messages)}
                      aria-pressed={selectedDay === weekday}
                      onClick={() => setSelectedDay(weekday)}
                      className={cn(
                        "rounded-md px-1 py-2 text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        selectedDay === weekday
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-card hover:text-foreground",
                      )}
                    >
                      {weekdayLabel(weekday, messages).slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {weekdayLabel(selectedDay, messages)}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatMessage(messages.lessonCount, {
                      count: mobileLessons.reduce(
                        (count, item) => count + item.session.participants.length,
                        0,
                      ),
                    })}
                  </span>
                </div>
                {mobileLessons.length === 0 ? (
                  <div className="rounded-lg bg-muted/35 px-3 py-8 text-center text-xs text-muted-foreground">
                    {messages.noWeeklySchedule}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mobileLessons.flatMap(({ period, session }) =>
                      session.participants.map((participant) => (
                        <article key={participant.id} className="rounded-lg bg-muted/35 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{participant.subjectName}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{participant.classLabel}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] font-semibold text-primary">
                                {periodTitle(period)}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                {period.startTime}–{period.endTime}
                              </p>
                            </div>
                          </div>
                        </article>
                      )),
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
  );
}

export function TeacherDetailTabs({
  teacher,
  canManageAssignments,
  canManageAccounts,
  initialTab,
  defaultEffectiveOn,
  locale,
  messages,
}: {
  teacher: TeacherDetail;
  canManageAssignments: boolean;
  canManageAccounts: boolean;
  initialTab?: string;
  defaultEffectiveOn: string;
  locale: Locale;
  messages: TeacherMessages;
}) {
  const text = messages.staff;
  const todayWeekday = weekdayFromDate(defaultEffectiveOn);
  const todaySessions = todayWeekday
    ? teacher.weeklySchedule.sessions.filter(
        (session) => session.weekday === todayWeekday,
      )
    : [];
  const todayLessonCount = todaySessions.reduce(
    (count, session) => count + session.participants.length,
    0,
  );
  const navigation: Array<{
    value: TeacherDetailTab;
    label: string;
    icon: typeof GraduationCap;
    count?: number;
  }> = [
    { value: "summary", label: text.summaryTab, icon: GraduationCap },
    {
      value: "homeroom",
      label: text.homeroomTab,
      icon: Home,
      count: teacher.homeroomAssignments.length || undefined,
    },
    {
      value: "courses",
      label: text.courseAssignmentsTab,
      icon: BookOpenCheck,
      count: teacher.courseAssignments.length || undefined,
    },
    {
      value: "schedule",
      label: text.weeklyScheduleTab,
      icon: CalendarDays,
      count: teacher.weeklySchedule.sessions.length || undefined,
    },
    { value: "account", label: text.accountTab, icon: ShieldCheck },
  ];
  const activeTab = navigation.some((item) => item.value === initialTab)
    ? (initialTab as TeacherDetailTab)
    : "summary";
  const dockItems: DockItemData[] = navigation.map(
    ({ value, label, icon: Icon, count }) => ({
      id: value,
      href: teacherTabHref(teacher.id, value),
      icon: <Icon aria-hidden />,
      label,
      active: value === activeTab,
      badge: count,
    }),
  );
  const statusActive =
    teacher.status === "ACTIVE" && teacher.employmentStatus === "ACTIVE";

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {teacher.photoUrl ? (
              <Image
                src={teacher.photoUrl}
                alt={teacher.fullName}
                width={72}
                height={72}
                priority
                className="size-14 shrink-0 rounded-lg object-cover sm:size-16"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary sm:size-16">
                {initials(teacher.fullName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary">
                {text.teacherDetailEyebrow}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {teacher.fullName}
                </h1>
                <Badge variant={statusActive ? "success" : "warning"}>
                  {statusActive
                    ? text.active
                    : teacher.employmentStatus === "ENDED"
                      ? text.ended
                      : text.onLeave}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {teacher.title} · {text.staffNumber}: {teacher.staffNumber}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{teacher.department}</span>
                <span>{teacher.position}</span>
                {teacher.activeYear ? <span>{teacher.activeYear.name}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/teachers">
                <ArrowLeft aria-hidden />
                {text.backToTeachers}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/staff/${teacher.employmentId}`}>
                {text.openStaffRecord}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Dock
        items={dockItems}
        label={text.teacherDetailNavigation}
        className="min-h-[60px] px-0"
      />

      <section
        aria-label={navigation.find((item) => item.value === activeTab)?.label}
        className="min-w-0 space-y-3 lg:max-h-[calc(100svh-17rem)] lg:min-h-[430px] lg:overflow-y-auto lg:pr-1"
      >
        {activeTab === "summary" ? (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryMetric
                icon={<CalendarDays className="size-4" aria-hidden />}
                label={text.activeAcademicYear}
                value={teacher.activeYear?.name ?? "—"}
                note={
                  teacher.activeYear
                    ? `${teacher.activeYear.startDate} → ${teacher.activeYear.endDate}`
                    : text.noActiveAcademicYear
                }
              />
              <SummaryMetric
                icon={<Home className="size-4" aria-hidden />}
                label={text.homeroomTab}
                value={teacher.homeroomAssignments.filter((item) => item.status === "ACTIVE").length}
              />
              <SummaryMetric
                icon={<BookOpenCheck className="size-4" aria-hidden />}
                label={text.courseAssignmentsTab}
                value={teacher.courseAssignments.filter((item) => item.status === "ACTIVE").length}
              />
              <SummaryMetric
                icon={<GraduationCap className="size-4" aria-hidden />}
                label={text.todaysSchedule}
                value={todayLessonCount}
                note={formatDate(defaultEffectiveOn, locale)}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <Card size="sm">
                <CardHeader className="border-b">
                  <CardTitle>{text.teacherSummary}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Definition label={text.teacherType}>
                      {teacher.category === "CLASSROOM"
                        ? text.classroomTeacher
                        : text.branchTeacher}
                    </Definition>
                    <Definition label={text.titleColumn}>{teacher.title}</Definition>
                    <Definition label={text.phone}>{teacher.phone ?? "—"}</Definition>
                    <Definition label={text.email}>{teacher.email ?? "—"}</Definition>
                  </dl>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {text.subjectCapabilities}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {teacher.subjects.length ? (
                        teacher.subjects.map((subject) => (
                          <Badge key={subject.id} variant="outline">
                            {subject.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {text.noSubjectCapabilities}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{text.todaysSchedule}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {todayWeekday
                          ? weekdayLabel(todayWeekday, text)
                          : text.todaysScheduleDescription}{" "}
                        · {formatDate(defaultEffectiveOn, locale)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {formatMessage(text.lessonCount, { count: todayLessonCount })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {todaySessions.length === 0 ? (
                    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg bg-muted/35 px-4 text-center">
                      <CalendarDays className="size-7 text-primary" aria-hidden />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {text.noLessonsToday}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaySessions.flatMap((session) => {
                        const period = teacher.weeklySchedule.periods.find(
                          (item) => item.id === session.schedulePeriodId,
                        );
                        return session.participants.map((participant) => (
                          <article
                            key={participant.id}
                            className="flex items-start justify-between gap-3 rounded-lg bg-muted/35 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {participant.subjectName}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {participant.classLabel} · {trackLabel(participant.track, text)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] font-semibold text-primary">
                                {period ? periodTitle(period) : session.periodLabel}
                              </p>
                              {period ? (
                                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                  {period.startTime}–{period.endTime}
                                </p>
                              ) : null}
                            </div>
                          </article>
                        ));
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {activeTab === "homeroom" ? (
          <HomeroomTab
            teacher={teacher}
            defaultEffectiveOn={defaultEffectiveOn}
            canManageAssignments={canManageAssignments}
            messages={messages}
          />
        ) : null}

        {activeTab === "courses" ? (
          <CourseAssignmentsTab
            teacher={teacher}
            defaultEffectiveOn={defaultEffectiveOn}
            canManageAssignments={canManageAssignments}
            messages={messages}
          />
        ) : null}

        {activeTab === "schedule" ? (
          <WeeklyScheduleTab
            teacher={teacher}
            initialDay={todayWeekday}
            messages={text}
          />
        ) : null}

        {activeTab === "account" ? (
          <PersonAccountPanel
            title={text.teacherAccount}
            portal="TEACHER"
            personId={teacher.personId}
            existingAccount={teacher.teacherAccount}
            canManage={canManageAccounts}
          />
        ) : null}
      </section>
    </div>
  );
}
