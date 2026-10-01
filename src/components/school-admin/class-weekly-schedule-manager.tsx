"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  passivateClassTimetableParticipantAction,
  saveClassWeeklySchedulePlacementAction,
} from "@/app/(school-admin)/academics/timetable/actions";
import type { TeachingState } from "@/lib/teaching-validation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { AppDictionary } from "@/i18n/dictionaries/types";

type StaffMessages = AppDictionary["staff"];

type TimetableWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY";

type ClassWeeklyScheduleData = {
  activeYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  classSections: {
    id: string;
    label: string;
    hasScheduleProfile: boolean;
  }[];
  selectedClassId: string | null;
  selectedClassLabel: string | null;
  schedulePeriods: {
    id: string;
    label: string;
    sequence: number;
    startTime: string;
    endTime: string;
  }[];
  courseAssignments: {
    id: string;
    teacherProfileId: string;
    teacherName: string;
    courseOfferingId: string;
    subjectName: string;
    track: string;
  }[];
  participants: {
    id: string;
    revision: string;
    timetableSessionId: string;
    courseTeacherAssignmentId: string;
    teacherProfileId: string;
    teacherName: string;
    weekday: TimetableWeekday;
    schedulePeriodId: string;
    classLabel: string;
    subjectName: string;
    track: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    note: string | null;
  }[];
  weekdays: TimetableWeekday[];
};

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

function TimetableParticipantTransitionForm({
  participant,
  defaultEffectiveOn,
  messages,
  action,
  pending,
}: {
  participant: ClassWeeklyScheduleData["participants"][number];
  defaultEffectiveOn: string;
  messages: StaffMessages;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="hidden"
        name="detailTeacherProfileId"
        value={participant.teacherProfileId}
      />
      <input
        type="hidden"
        name="timetableParticipantId"
        value={participant.id}
      />
      <input type="hidden" name="revision" value={participant.revision} />
      <Input
        aria-label={messages.scheduleEffectiveOn}
        className="h-7 w-36 text-xs"
        name="effectiveOn"
        type="date"
        defaultValue={defaultEffectiveOn}
        min={participant.effectiveFrom}
        required
      />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {messages.removeFromSchedule}
      </Button>
    </form>
  );
}

export function ClassWeeklyScheduleManager({
  data,
  canManageSchedule,
  defaultEffectiveOn,
  messages,
}: {
  data: ClassWeeklyScheduleData;
  canManageSchedule: boolean;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const router = useRouter();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    () => data.courseAssignments[0]?.id ?? "",
  );
  const selectedAssignment =
    data.courseAssignments.find(
      (assignment) => assignment.id === selectedAssignmentId,
    ) ??
    data.courseAssignments[0] ??
    null;
  const selectedAssignmentValue = selectedAssignment?.id ?? "";
  const [createState, createAction, createPending] = useActionState<
    TeachingState,
    FormData
  >(saveClassWeeklySchedulePlacementAction, {});
  const [transitionState, transitionAction, transitionPending] = useActionState<
    TeachingState,
    FormData
  >(passivateClassTimetableParticipantAction, {});
  const participantsBySlot = new Map<
    string,
    ClassWeeklyScheduleData["participants"]
  >();
  for (const participant of data.participants) {
    const key = `${participant.weekday}:${participant.schedulePeriodId}`;
    const participants = participantsBySlot.get(key) ?? [];
    participants.push(participant);
    participantsBySlot.set(key, participants);
  }
  const canCreate =
    canManageSchedule &&
    Boolean(data.activeYear) &&
    Boolean(data.selectedClassId) &&
    Boolean(selectedAssignment) &&
    data.schedulePeriods.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.classWeeklyScheduleSetupTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data.activeYear ? (
            <Alert variant="warning">{messages.noActiveAcademicYear}</Alert>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
            <div className="space-y-2">
              <Label htmlFor="classSectionSelector">
                {messages.selectClassSection}
              </Label>
              <NativeSelect
                id="classSectionSelector"
                value={data.selectedClassId ?? ""}
                disabled={!data.activeYear || data.classSections.length === 0}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  router.push(
                    value
                      ? `/academics/timetable?classSectionId=${encodeURIComponent(value)}`
                      : "/academics/timetable",
                  );
                }}
              >
                <option value="">{messages.selectClassSection}</option>
                {data.classSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                    {section.hasScheduleProfile
                      ? ""
                      : ` · ${messages.noSchedulePeriods}`}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">
                {data.selectedClassLabel ?? messages.noClassSectionsForYear}
              </p>
              <p className="mt-1 text-muted-foreground">
                {messages.classWeeklyScheduleDescription}
              </p>
            </div>
          </div>

          {canManageSchedule ? (
            <form
              action={createAction}
              className="grid gap-4 rounded-xl border border-border p-4 xl:grid-cols-[minmax(260px,1.2fr)_minmax(160px,0.7fr)_minmax(180px,0.8fr)_minmax(150px,0.7fr)]"
            >
              <input
                type="hidden"
                name="academicYearClassSectionId"
                value={data.selectedClassId ?? ""}
              />
              <input
                type="hidden"
                name="teacherProfileId"
                value={selectedAssignment?.teacherProfileId ?? ""}
              />
              <div className="space-y-2">
                <Label htmlFor="courseTeacherAssignmentId">
                  {messages.selectCourseAssignment}
                </Label>
                <NativeSelect
                  id="courseTeacherAssignmentId"
                  name="courseTeacherAssignmentId"
                  value={selectedAssignmentValue}
                  disabled={!data.selectedClassId || data.courseAssignments.length === 0}
                  onChange={(event) =>
                    setSelectedAssignmentId(event.currentTarget.value)
                  }
                  required
                >
                  <option value="">{messages.selectCourseAssignment}</option>
                  {data.courseAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.subjectName} · {assignment.teacherName} ·{" "}
                      {trackLabel(assignment.track, messages)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekday">{messages.selectWeekday}</Label>
                <NativeSelect
                  id="weekday"
                  name="weekday"
                  disabled={!data.selectedClassId}
                  required
                >
                  <option value="">{messages.selectWeekday}</option>
                  {data.weekdays.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {weekdayLabel(weekday, messages)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedulePeriodId">
                  {messages.selectSchedulePeriod}
                </Label>
                <NativeSelect
                  id="schedulePeriodId"
                  name="schedulePeriodId"
                  disabled={!data.selectedClassId || data.schedulePeriods.length === 0}
                  required
                >
                  <option value="">{messages.selectSchedulePeriod}</option>
                  {data.schedulePeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleEffectiveFrom">
                  {messages.effectiveDate}
                </Label>
                <Input
                  id="scheduleEffectiveFrom"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  min={data.activeYear?.startDate}
                  max={data.activeYear?.endDate}
                  disabled={!data.selectedClassId}
                  required
                />
              </div>
              <label className="flex items-start gap-3 text-sm xl:col-span-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  name="mergeWithTeacherSession"
                />
                <span>{messages.mergeWithTeacherSession}</span>
              </label>
              <label className="flex items-start gap-3 text-sm xl:col-span-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  name="allowClassConflict"
                />
                <span>{messages.allowClassConflict}</span>
              </label>
              <div className="space-y-2 xl:col-span-3">
                <Label htmlFor="scheduleNote">{messages.assignmentNote}</Label>
                <Textarea id="scheduleNote" name="note" rows={2} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createPending || !canCreate}>
                  {messages.saveSchedulePlacement}
                </Button>
              </div>
              {data.courseAssignments.length === 0 && data.selectedClassId ? (
                <Alert variant="warning" className="xl:col-span-4">
                  {messages.noCourseAssignments}
                </Alert>
              ) : null}
              {data.schedulePeriods.length === 0 && data.selectedClassId ? (
                <Alert variant="warning" className="xl:col-span-4">
                  {messages.noSchedulePeriods}
                </Alert>
              ) : null}
              {createState.status ? (
                <Alert
                  className="xl:col-span-4"
                  variant={createState.status === "error" ? "danger" : "success"}
                >
                  {createState.message}
                </Alert>
              ) : null}
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.classWeeklyScheduleGridTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transitionState.status ? (
            <Alert
              variant={transitionState.status === "error" ? "danger" : "success"}
            >
              {transitionState.message}
            </Alert>
          ) : null}
          {data.schedulePeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {messages.noWeeklySchedule}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">
                      {messages.schedulePeriodColumn}
                    </TableHead>
                    {data.weekdays.map((weekday) => (
                      <TableHead key={weekday} className="min-w-56">
                        {weekdayLabel(weekday, messages)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.schedulePeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="align-top font-medium">
                        {period.label}
                      </TableCell>
                      {data.weekdays.map((weekday) => {
                        const participants =
                          participantsBySlot.get(`${weekday}:${period.id}`) ??
                          [];
                        return (
                          <TableCell
                            key={`${weekday}-${period.id}`}
                            className="align-top"
                          >
                            {participants.length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            ) : (
                              <div className="space-y-2">
                                {participants.map((participant) => (
                                  <div
                                    key={participant.id}
                                    className="rounded-lg border border-border bg-muted/30 p-2"
                                  >
                                    <p className="font-medium">
                                      {participant.subjectName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {participant.teacherName}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <Badge variant="outline">
                                        {trackLabel(participant.track, messages)}
                                      </Badge>
                                      <Badge variant="success">
                                        {messages.activeAssignment}
                                      </Badge>
                                    </div>
                                    {canManageSchedule ? (
                                      <TimetableParticipantTransitionForm
                                        participant={participant}
                                        defaultEffectiveOn={defaultEffectiveOn}
                                        messages={messages}
                                        action={transitionAction}
                                        pending={transitionPending}
                                      />
                                    ) : null}
                                  </div>
                                ))}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
