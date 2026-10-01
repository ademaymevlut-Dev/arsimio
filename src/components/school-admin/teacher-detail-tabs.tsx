"use client";

import Link from "next/link";
import { useActionState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { PersonAccountPanel } from "./person-account-panel";

type StaffMessages = AppDictionary["staff"];

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

function AssignmentTransitionForm({
  assignmentKind,
  assignment,
  detailTeacherProfileId,
  defaultEffectiveOn,
  messages,
  action,
  pending,
}: {
  assignmentKind: "homeroom" | "course";
  assignment: AssignmentRow;
  detailTeacherProfileId: string;
  defaultEffectiveOn: string;
  messages: StaffMessages;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (assignment.status !== "ACTIVE") return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input
        type="hidden"
        name="detailTeacherProfileId"
        value={detailTeacherProfileId}
      />
      <input type="hidden" name="assignmentKind" value={assignmentKind} />
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="revision" value={assignment.revision} />
      <div className="space-y-1">
        <Label htmlFor={`${assignmentKind}-${assignment.id}-effectiveOn`}>
          {messages.passivateOn}
        </Label>
        <Input
          id={`${assignmentKind}-${assignment.id}-effectiveOn`}
          name="effectiveOn"
          type="date"
          defaultValue={defaultEffectiveOn}
          min={assignment.effectiveFrom}
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {messages.passivateAssignment}
      </Button>
    </form>
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
  messages: StaffMessages;
}) {
  const [createState, createAction, createPending] = useActionState<
    TeachingState,
    FormData
  >(saveHomeroomTeacherAssignmentAction, {});
  const [transitionState, transitionAction, transitionPending] = useActionState<
    TeachingState,
    FormData
  >(passivateTeachingAssignmentAction, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.assignHomeroom}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {messages.homeroomHelp}
          </p>
          {!teacher.activeYear ? (
            <Alert variant="warning">{messages.noActiveAcademicYear}</Alert>
          ) : null}
          {canManageAssignments ? (
            <form action={createAction} className="space-y-4">
              <input type="hidden" name="teacherProfileId" value={teacher.id} />
              <div className="space-y-2">
                <Label htmlFor="academicYearClassSectionId">
                  {messages.selectClassSection}
                </Label>
                <NativeSelect
                  id="academicYearClassSectionId"
                  name="academicYearClassSectionId"
                  disabled={!teacher.activeYear || teacher.classSections.length === 0}
                  required
                >
                  <option value="">{messages.selectClassSection}</option>
                  {teacher.classSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                      {section.activeTeacherName
                        ? section.activeTeacherProfileId === teacher.id
                          ? ` · ${messages.alreadyAssignedToThisTeacher}`
                          : ` · ${messages.assignedTo}: ${section.activeTeacherName}`
                        : ""}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeroomEffectiveFrom">
                  {messages.effectiveDate}
                </Label>
                <Input
                  id="homeroomEffectiveFrom"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  min={teacher.activeYear?.startDate}
                  max={teacher.activeYear?.endDate}
                  disabled={!teacher.activeYear}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeroomNote">{messages.assignmentNote}</Label>
                <Textarea id="homeroomNote" name="note" rows={3} />
              </div>
              {teacher.classSections.length === 0 && teacher.activeYear ? (
                <Alert variant="warning">{messages.noClassSectionsForYear}</Alert>
              ) : null}
              {createState.status ? (
                <Alert
                  variant={createState.status === "error" ? "danger" : "success"}
                >
                  {createState.message}
                </Alert>
              ) : null}
              <Button
                type="submit"
                disabled={
                  createPending ||
                  !teacher.activeYear ||
                  teacher.classSections.length === 0
                }
              >
                {messages.saveAssignment}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.homeroomAssignments}</CardTitle>
        </CardHeader>
        <CardContent>
          {transitionState.status ? (
            <Alert
              className="mb-4"
              variant={transitionState.status === "error" ? "danger" : "success"}
            >
              {transitionState.message}
            </Alert>
          ) : null}
          {teacher.homeroomAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {messages.noHomeroomAssignments}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{messages.classSectionColumn}</TableHead>
                    <TableHead>{messages.effectiveRange}</TableHead>
                    <TableHead>{messages.assignmentStatus}</TableHead>
                    <TableHead>{messages.note}</TableHead>
                    <TableHead>{messages.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.homeroomAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.classLabel}
                      </TableCell>
                      <TableCell>
                        {assignment.effectiveFrom}
                        {assignment.effectiveTo
                          ? ` → ${assignment.effectiveTo}`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {assignmentStatusBadge(assignment.status, messages)}
                      </TableCell>
                      <TableCell>{assignment.note ?? "—"}</TableCell>
                      <TableCell>
                        {canManageAssignments ? (
                          <AssignmentTransitionForm
                            assignmentKind="homeroom"
                            assignment={assignment}
                            detailTeacherProfileId={teacher.id}
                            defaultEffectiveOn={defaultEffectiveOn}
                            messages={messages}
                            action={transitionAction}
                            pending={transitionPending}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
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

function CourseAssignmentsTab({
  teacher,
  defaultEffectiveOn,
  canManageAssignments,
  messages,
}: {
  teacher: TeacherDetail;
  defaultEffectiveOn: string;
  canManageAssignments: boolean;
  messages: StaffMessages;
}) {
  const [createState, createAction, createPending] = useActionState<
    TeachingState,
    FormData
  >(saveCourseTeacherAssignmentAction, {});
  const [transitionState, transitionAction, transitionPending] = useActionState<
    TeachingState,
    FormData
  >(passivateTeachingAssignmentAction, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.assignCourseTeacher}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {messages.courseAssignmentsHelp}
          </p>
          {!teacher.activeYear ? (
            <Alert variant="warning">{messages.noActiveAcademicYear}</Alert>
          ) : null}
          {canManageAssignments ? (
            <form action={createAction} className="space-y-4">
              <input type="hidden" name="teacherProfileId" value={teacher.id} />
              <div className="space-y-2">
                <Label htmlFor="courseOfferingId">
                  {messages.selectCourseOffering}
                </Label>
                <NativeSelect
                  id="courseOfferingId"
                  name="courseOfferingId"
                  disabled={!teacher.activeYear || teacher.courseOfferings.length === 0}
                  required
                >
                  <option value="">{messages.selectCourseOffering}</option>
                  {teacher.courseOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.label} · {trackLabel(offering.track, messages)}
                      {offering.activeTeacherName
                        ? offering.activeTeacherProfileId === teacher.id
                          ? ` · ${messages.alreadyAssignedToThisTeacher}`
                          : ` · ${messages.assignedTo}: ${offering.activeTeacherName}`
                        : ""}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseEffectiveFrom">
                  {messages.effectiveDate}
                </Label>
                <Input
                  id="courseEffectiveFrom"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  min={teacher.activeYear?.startDate}
                  max={teacher.activeYear?.endDate}
                  disabled={!teacher.activeYear}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseNote">{messages.assignmentNote}</Label>
                <Textarea id="courseNote" name="note" rows={3} />
              </div>
              {teacher.courseOfferings.length === 0 && teacher.activeYear ? (
                <Alert variant="warning">{messages.noCourseOfferingsForYear}</Alert>
              ) : null}
              {createState.status ? (
                <Alert
                  variant={createState.status === "error" ? "danger" : "success"}
                >
                  {createState.message}
                </Alert>
              ) : null}
              <Button
                type="submit"
                disabled={
                  createPending ||
                  !teacher.activeYear ||
                  teacher.courseOfferings.length === 0
                }
              >
                {messages.saveAssignment}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.courseAssignments}</CardTitle>
        </CardHeader>
        <CardContent>
          {transitionState.status ? (
            <Alert
              className="mb-4"
              variant={transitionState.status === "error" ? "danger" : "success"}
            >
              {transitionState.message}
            </Alert>
          ) : null}
          {teacher.courseAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {messages.noCourseAssignments}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{messages.classSectionColumn}</TableHead>
                    <TableHead>{messages.courseColumn}</TableHead>
                    <TableHead>{messages.effectiveRange}</TableHead>
                    <TableHead>{messages.assignmentStatus}</TableHead>
                    <TableHead>{messages.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.courseAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.classLabel}</TableCell>
                      <TableCell className="font-medium">
                        {assignment.subjectName}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {trackLabel(assignment.track, messages)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {assignment.effectiveFrom}
                        {assignment.effectiveTo
                          ? ` → ${assignment.effectiveTo}`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {assignmentStatusBadge(assignment.status, messages)}
                      </TableCell>
                      <TableCell>
                        {canManageAssignments ? (
                          <AssignmentTransitionForm
                            assignmentKind="course"
                            assignment={assignment}
                            detailTeacherProfileId={teacher.id}
                            defaultEffectiveOn={defaultEffectiveOn}
                            messages={messages}
                            action={transitionAction}
                            pending={transitionPending}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
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

function WeeklyScheduleTab({
  teacher,
  messages,
}: {
  teacher: TeacherDetail;
  messages: StaffMessages;
}) {
  const sessionsBySlot = new Map<string, TimetableSessionRow[]>();
  for (const session of teacher.weeklySchedule.sessions) {
    const key = `${session.weekday}:${session.schedulePeriodId}`;
    const sessions = sessionsBySlot.get(key) ?? [];
    sessions.push(session);
    sessionsBySlot.set(key, sessions);
  }

  return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.weeklyScheduleGridTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teacher.weeklySchedule.periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {messages.noWeeklySchedule}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-36">
                      {messages.schedulePeriodColumn}
                    </TableHead>
                    {teacher.weeklySchedule.weekdays.map((weekday) => (
                      <TableHead key={weekday} className="min-w-56">
                        {weekdayLabel(weekday, messages)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.weeklySchedule.periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="align-top font-medium">
                        {period.label}
                      </TableCell>
                      {teacher.weeklySchedule.weekdays.map((weekday) => {
                        const sessions =
                          sessionsBySlot.get(`${weekday}:${period.id}`) ?? [];
                        return (
                          <TableCell
                            key={`${weekday}-${period.id}`}
                            className="align-top"
                          >
                            {sessions.length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            ) : (
                              <div className="space-y-3">
                                {sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="space-y-2 rounded-lg border border-border p-2"
                                  >
                                    {session.participants.map((participant) => (
                                      <div
                                        key={participant.id}
                                        className="rounded-md bg-muted/40 p-2"
                                      >
                                        <p className="font-medium">
                                          {participant.classLabel} ·{" "}
                                          {participant.subjectName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {trackLabel(participant.track, messages)}
                                        </p>
                                      </div>
                                    ))}
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
  );
}

export function TeacherDetailTabs({
  teacher,
  canManageAssignments,
  canManageAccounts,
  defaultEffectiveOn,
  messages,
}: {
  teacher: TeacherDetail;
  canManageAssignments: boolean;
  canManageAccounts: boolean;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  return (
    <Tabs defaultValue="summary">
      <TabsList>
        <TabsTrigger value="summary">{messages.summaryTab}</TabsTrigger>
        <TabsTrigger value="homeroom">{messages.homeroomTab}</TabsTrigger>
        <TabsTrigger value="courses">{messages.courseAssignmentsTab}</TabsTrigger>
        <TabsTrigger value="schedule">{messages.weeklyScheduleTab}</TabsTrigger>
        <TabsTrigger value="account">{messages.accountTab}</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{messages.teacherSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.staffNumber}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.staffNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.titleColumn}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.title}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.teacherType}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {teacher.category === "CLASSROOM"
                      ? messages.classroomTeacher
                      : messages.branchTeacher}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.statusLabel}
                  </dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        teacher.status === "ACTIVE" &&
                        teacher.employmentStatus === "ACTIVE"
                          ? "success"
                          : "warning"
                      }
                    >
                      {teacher.status === "ACTIVE"
                        ? messages.active
                        : messages.onLeave}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.department}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.department}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.position}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.position}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.phone}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {messages.email}
                  </dt>
                  <dd className="mt-1 font-medium">{teacher.email ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <Button asChild variant="outline">
                  <Link href={`/staff/${teacher.employmentId}`}>
                    {messages.openStaffRecord}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>{messages.activeAcademicYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teacher.activeYear ? (
                <div>
                  <p className="font-medium">{teacher.activeYear.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {teacher.activeYear.startDate} → {teacher.activeYear.endDate}
                  </p>
                </div>
              ) : (
                <Alert variant="warning">{messages.noActiveAcademicYear}</Alert>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  {messages.subjectCapabilities}
                </p>
                <p className="mt-1 text-sm">
                  {teacher.subjects.length
                    ? teacher.subjects.map((subject) => subject.name).join(", ")
                    : messages.noSubjectCapabilities}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="homeroom">
        <HomeroomTab
          teacher={teacher}
          defaultEffectiveOn={defaultEffectiveOn}
          canManageAssignments={canManageAssignments}
          messages={messages}
        />
      </TabsContent>

      <TabsContent value="courses">
        <CourseAssignmentsTab
          teacher={teacher}
          defaultEffectiveOn={defaultEffectiveOn}
          canManageAssignments={canManageAssignments}
          messages={messages}
        />
      </TabsContent>

      <TabsContent value="schedule">
        <WeeklyScheduleTab
          teacher={teacher}
          messages={messages}
        />
      </TabsContent>

      <TabsContent value="account">
        <PersonAccountPanel
          title={messages.teacherAccount}
          portal="TEACHER"
          personId={teacher.personId}
          existingAccount={teacher.teacherAccount}
          canManage={canManageAccounts}
        />
      </TabsContent>
    </Tabs>
  );
}
