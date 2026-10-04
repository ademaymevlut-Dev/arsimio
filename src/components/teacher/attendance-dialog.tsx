"use client";

import { useActionState, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveStudentAttendanceAction } from "@/app/teacher/actions";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { TeacherCtaState } from "@/lib/teacher-cta-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type StaffMessages = AppDictionary["staff"];
type AttendanceStatus = "NONE" | "ABSENT" | "LATE";

type StudentOption = {
  id: string;
  studentNumber: string;
  fullName: string;
};

type ExistingAttendance = {
  id: string;
  studentProfileId: string;
  status: "ABSENT" | "LATE";
  openedAt: string;
  openedBy: string;
  lateAt: string | null;
  lateBy: string | null;
};

function actionButtonVariant(
  current: AttendanceStatus,
  target: AttendanceStatus,
) {
  if (current !== target) return "outline";
  if (target === "ABSENT") return "danger";
  if (target === "LATE") return "warning";
  return "secondary";
}

function statusBadge(
  status: AttendanceStatus,
  messages: StaffMessages,
) {
  if (status === "ABSENT")
    return <Badge variant="danger">{messages.attendanceAbsent}</Badge>;
  if (status === "LATE")
    return <Badge variant="warning">{messages.attendanceLate}</Badge>;
  return <Badge variant="outline">{messages.attendanceNoRecord}</Badge>;
}

export function AttendanceDialog({
  timetableParticipantId,
  academicCalendarDayId,
  students,
  existingAttendance,
  contextLabel,
  messages,
}: {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  students: StudentOption[];
  existingAttendance: ExistingAttendance[];
  contextLabel: string;
  messages: StaffMessages;
}) {
  const existingByStudentId = useMemo(
    () =>
      new Map(
        existingAttendance.map((record) => [
          record.studentProfileId,
          record,
        ]),
      ),
    [existingAttendance],
  );
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          existingByStudentId.get(student.id)?.status ?? "NONE",
        ]),
      ),
  );
  const [state, action, pending] = useActionState<TeacherCtaState, FormData>(
    saveStudentAttendanceAction,
    {},
  );

  const absentStudentProfileIds = students
    .filter((student) => {
      const current = statuses[student.id] ?? "NONE";
      const initial = existingByStudentId.get(student.id)?.status ?? "NONE";
      return current === "ABSENT" && current !== initial;
    })
    .map((student) => student.id);
  const lateStudentProfileIds = students
    .filter((student) => {
      const current = statuses[student.id] ?? "NONE";
      const initial = existingByStudentId.get(student.id)?.status ?? "NONE";
      return current === "LATE" && current !== initial;
    })
    .map((student) => student.id);
  const clearStudentProfileIds = existingAttendance
    .filter((record) => (statuses[record.studentProfileId] ?? "NONE") === "NONE")
    .map((record) => record.studentProfileId);

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((current) => ({ ...current, [studentId]: status }));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="xs" variant="info">
          {messages.attendanceCta}
          {existingAttendance.length > 0 ? ` (${existingAttendance.length})` : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{messages.attendanceDialogTitle}</DialogTitle>
          <DialogDescription>
            {messages.attendanceDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {contextLabel}
        </div>
        <form action={action} className="space-y-4">
          <input
            type="hidden"
            name="timetableParticipantId"
            value={timetableParticipantId}
          />
          <input
            type="hidden"
            name="academicCalendarDayId"
            value={academicCalendarDayId}
          />
          {absentStudentProfileIds.map((studentId) => (
            <input
              key={`absent-${studentId}`}
              type="hidden"
              name="absentStudentProfileIds"
              value={studentId}
            />
          ))}
          {lateStudentProfileIds.map((studentId) => (
            <input
              key={`late-${studentId}`}
              type="hidden"
              name="lateStudentProfileIds"
              value={studentId}
            />
          ))}
          {clearStudentProfileIds.map((studentId) => (
            <input
              key={`clear-${studentId}`}
              type="hidden"
              name="clearStudentProfileIds"
              value={studentId}
            />
          ))}

          <section className="space-y-3 rounded-lg border border-border p-3">
            <h3 className="font-medium text-primary">
              {messages.attendanceStudentsColumn}
            </h3>
            {students.length === 0 ? (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {messages.noStudentsForAttendance}
              </p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {students.map((student) => {
                  const record = existingByStudentId.get(student.id);
                  const status = statuses[student.id] ?? "NONE";
                  return (
                    <div
                      key={student.id}
                      className="rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-primary">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            No: {student.studentNumber}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {statusBadge(status, messages)}
                            {record ? (
                              <Badge
                                variant={
                                  record.status === "ABSENT"
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {record.status === "ABSENT"
                                  ? messages.existingAttendanceAbsentBadge
                                  : messages.existingAttendanceLateBadge}
                              </Badge>
                            ) : null}
                          </div>
                          {record ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {record.openedBy}
                              {record.lateBy ? ` · ${record.lateBy}` : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="xs"
                            variant={actionButtonVariant(status, "NONE")}
                            onClick={() => setStudentStatus(student.id, "NONE")}
                            disabled={pending}
                          >
                            {messages.attendanceClear}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant={actionButtonVariant(status, "ABSENT")}
                            onClick={() =>
                              setStudentStatus(student.id, "ABSENT")
                            }
                            disabled={pending}
                          >
                            {messages.attendanceAbsent}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant={actionButtonVariant(status, "LATE")}
                            onClick={() => setStudentStatus(student.id, "LATE")}
                            disabled={pending}
                          >
                            {messages.attendanceLate}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {state.fieldErrors?.studentProfileIds ? (
              <p className="text-sm text-danger-foreground">
                {state.fieldErrors.studentProfileIds}
              </p>
            ) : null}
          </section>

          {state.message ? (
            <Alert
              variant={state.status === "success" ? "success" : "danger"}
            >
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {messages.lessonTopicClose}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || students.length === 0}>
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              {messages.saveStudentAttendance}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
