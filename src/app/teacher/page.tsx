import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { AttendanceDialog } from "@/components/teacher/attendance-dialog";
import { ExamNotificationDialog } from "@/components/teacher/exam-notification-dialog";
import { HomeworkDialog } from "@/components/teacher/homework-dialog";
import { LessonTopicDialog } from "@/components/teacher/lesson-topic-dialog";
import { StudentCommentsDialog } from "@/components/teacher/student-comments-dialog";
import { TeacherWeekSelector } from "@/components/teacher/teacher-week-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HTML_LOCALES } from "@/i18n/config";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import {
  dateOnlyInTimeZone,
  dateOnlyValue,
} from "@/lib/academic-calendar-validation";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { getTeacherPortalHome } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

type TimetableWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY";

type StaffMessages = AppDictionary["staff"];

function weekdayLabel(weekday: TimetableWeekday, text: StaffMessages) {
  if (weekday === "MONDAY") return text.weekdayMonday;
  if (weekday === "TUESDAY") return text.weekdayTuesday;
  if (weekday === "WEDNESDAY") return text.weekdayWednesday;
  if (weekday === "THURSDAY") return text.weekdayThursday;
  return text.weekdayFriday;
}

function trackLabel(track: string, text: StaffMessages) {
  if (track === "ELECTIVE") return text.subjectTrackElective;
  if (track === "IGCSE") return text.subjectTrackIgcse;
  return text.subjectTrackGeneral;
}

function formatDate(value: string, locale: keyof typeof HTML_LOCALES) {
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function visibleOnTeacherSchedule(
  record: { effectiveTo: string | null },
  date: string,
) {
  return !record.effectiveTo || record.effectiveTo >= date;
}

export default async function TeacherPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { tenant, account } = await requirePortalAccount("TEACHER");
  const locale = await getSchoolLocale(undefined, tenant.school.defaultLocale);
  const [home, dictionary, query] = await Promise.all([
    getTeacherPortalHome(tenant.school.id, account.personId, locale),
    getDictionary(locale),
    searchParams,
  ]);
  if (!home) notFound();
  const text = dictionary.staff;
  const teacherStatus = home.status === "ACTIVE" ? text.active : text.onLeave;
  const employmentStatus =
    home.employmentStatus === "ACTIVE"
      ? text.active
      : home.employmentStatus === "ON_LEAVE"
        ? text.onLeave
        : text.ended;
  const sessionsBySlot = new Map<
    string,
    (typeof home.weeklySchedule.sessions)[number][]
  >();
  for (const session of home.weeklySchedule.sessions) {
    const key = `${session.weekday}:${session.schedulePeriodId}`;
    const sessions = sessionsBySlot.get(key) ?? [];
    sessions.push(session);
    sessionsBySlot.set(key, sessions);
  }
  const requestedWeek =
    typeof query.week === "string"
      ? home.weeklySchedule.weeks.find(
          (week) => week.id === query.week || String(week.sequence) === query.week,
        ) ?? null
      : null;
  const today = dateOnlyValue(
    dateOnlyInTimeZone(new Date(), tenant.school.timezone),
  );
  const currentWeek =
    home.weeklySchedule.weeks.find(
      (week) => week.startDate <= today && week.endDate >= today,
    ) ?? null;
  const firstFutureWeek =
    home.weeklySchedule.weeks.find((week) => week.startDate > today) ?? null;
  const selectedWeek =
    requestedWeek ??
    currentWeek ??
    firstFutureWeek ??
    home.weeklySchedule.weeks.at(-1) ??
    null;
  const selectedWeekIndex = selectedWeek
    ? home.weeklySchedule.weeks.findIndex((week) => week.id === selectedWeek.id)
    : -1;
  const previousWeek =
    selectedWeekIndex > 0
      ? home.weeklySchedule.weeks[selectedWeekIndex - 1]
      : null;
  const nextWeek =
    selectedWeekIndex >= 0 &&
    selectedWeekIndex < home.weeklySchedule.weeks.length - 1
      ? home.weeklySchedule.weeks[selectedWeekIndex + 1]
      : null;
  const weekOptions = home.weeklySchedule.weeks.map((week) => ({
    id: week.id,
    label: formatMessage(text.weekOptionLabel, {
      sequence: week.sequence,
      start: formatDate(week.startDate, locale),
      end: formatDate(week.endDate, locale),
    }),
  }));

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
              {text.teacherPortalEyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{home.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.school.name}
            </p>
          </div>
          <form action={signOut}>
            <Button variant="outline">{text.signOut}</Button>
          </form>
        </header>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>{text.teacherPortalCardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.staffNumber}
                </dt>
                <dd className="mt-1 font-mono font-medium">
                  {home.staffNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.statusLabel}
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant={
                      home.status === "ACTIVE" &&
                      home.employmentStatus === "ACTIVE"
                        ? "success"
                        : "warning"
                    }
                  >
                    {teacherStatus} / {employmentStatus}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.titleColumn}
                </dt>
                <dd className="mt-1 font-medium">{home.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.typeColumn}
                </dt>
                <dd className="mt-1 font-medium">
                  {home.category === "CLASSROOM"
                    ? text.classroomTeacher
                    : text.branchTeacher}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  {text.subjectCapabilities}
                </dt>
                <dd className="mt-1 font-medium">
                  {home.subjects.length ? home.subjects.join(", ") : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>{text.weeklyScheduleGridTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {home.activeYear ? (
              <p className="text-sm text-muted-foreground">
                {home.activeYear.name} · {home.activeYear.startDate} →{" "}
                {home.activeYear.endDate}
              </p>
            ) : null}
            {selectedWeek ? (
              <TeacherWeekSelector
                key={selectedWeek.id}
                weeks={weekOptions}
                selectedWeekId={selectedWeek.id}
                previousWeekId={previousWeek?.id ?? null}
                currentWeekId={currentWeek?.id ?? null}
                nextWeekId={nextWeek?.id ?? null}
                labels={{
                  selectWeek: text.selectWeek,
                  previousWeek: text.previousWeek,
                  currentWeek: text.currentWeek,
                  nextWeek: text.nextWeek,
                }}
              />
            ) : null}
            {!selectedWeek ? (
              <p className="text-sm text-muted-foreground">
                {text.noSchoolWeeks}
              </p>
            ) : home.weeklySchedule.periods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {text.noWeeklySchedule}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-40">
                        {text.schedulePeriodColumn}
                      </TableHead>
                      {selectedWeek.days.map((day) => (
                        <TableHead key={day.id} className="min-w-56">
                          {weekdayLabel(day.weekday, text)}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({formatDate(day.date, locale)})
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {home.weeklySchedule.periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="align-top font-medium">
                          {period.label}
                        </TableCell>
                        {selectedWeek.days.map((day) => {
                          const sessions = (
                            sessionsBySlot.get(`${day.weekday}:${period.id}`) ??
                            []
                          )
                            .filter((session) =>
                              visibleOnTeacherSchedule(session, day.date),
                            )
                            .map((session) => ({
                              ...session,
                              participants: session.participants.filter(
                                (participant) =>
                                  visibleOnTeacherSchedule(
                                    participant,
                                    day.date,
                                  ),
                              ),
                            }))
                            .filter(
                              (session) => session.participants.length > 0,
                            );
                          return (
                            <TableCell
                              key={`${day.id}-${period.id}`}
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
                                      className="space-y-2 rounded-lg border border-border bg-card p-2"
                                    >
                                      {session.participants.map((participant) => {
                                        const lessonTopicEntry =
                                          participant.lessonTopicEntries.find(
                                            (entry) =>
                                              entry.academicCalendarDayId ===
                                              day.id,
                                          );
                                        const homeworkEntry =
                                          participant.homeworkEntries.find(
                                            (entry) =>
                                              entry.academicCalendarDayId ===
                                              day.id,
                                          );
                                        const examNotificationEntry =
                                          participant.examNotificationEntries.find(
                                            (entry) =>
                                              entry.academicCalendarDayId ===
                                              day.id,
                                          );
                                        const commentEntries =
                                          participant.commentEntries.filter(
                                            (entry) =>
                                              entry.academicCalendarDayId ===
                                              day.id,
                                          );
                                        const attendanceRecords =
                                          participant.attendanceRecords.filter(
                                            (entry) =>
                                              entry.academicCalendarDayId ===
                                              day.id,
                                          );
                                        const contextLabel = `${weekdayLabel(
                                          day.weekday,
                                          text,
                                        )} (${formatDate(
                                          day.date,
                                          locale,
                                        )}) · ${period.label} · ${
                                          participant.classLabel
                                        } · ${participant.subjectName}`;

                                        return (
                                          <div
                                            key={participant.id}
                                            className="rounded-md bg-muted/40 p-2"
                                          >
                                            <p className="font-medium">
                                              {participant.subjectName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {text.classSectionColumn}:{" "}
                                              {participant.classLabel} ·{" "}
                                              {trackLabel(
                                                participant.track,
                                                text,
                                              )}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              <LessonTopicDialog
                                                timetableParticipantId={
                                                  participant.id
                                                }
                                                academicCalendarDayId={day.id}
                                                initialContent={
                                                  lessonTopicEntry?.content ??
                                                  ""
                                                }
                                                contextLabel={contextLabel}
                                                messages={text}
                                              />
                                              <AttendanceDialog
                                                timetableParticipantId={
                                                  participant.id
                                                }
                                                academicCalendarDayId={day.id}
                                                students={participant.students}
                                                existingAttendance={
                                                  attendanceRecords
                                                }
                                                contextLabel={contextLabel}
                                                messages={text}
                                              />
                                              <StudentCommentsDialog
                                                timetableParticipantId={
                                                  participant.id
                                                }
                                                academicCalendarDayId={day.id}
                                                students={participant.students}
                                                existingComments={
                                                  commentEntries
                                                }
                                                contextLabel={contextLabel}
                                                messages={text}
                                              />
                                              <HomeworkDialog
                                                timetableParticipantId={
                                                  participant.id
                                                }
                                                academicCalendarDayId={day.id}
                                                initialTitle={
                                                  homeworkEntry?.title ?? ""
                                                }
                                                initialContent={
                                                  homeworkEntry?.content ?? ""
                                                }
                                                contextLabel={contextLabel}
                                                messages={text}
                                              />
                                              <ExamNotificationDialog
                                                timetableParticipantId={
                                                  participant.id
                                                }
                                                academicCalendarDayId={day.id}
                                                initialContent={
                                                  examNotificationEntry?.content ??
                                                  ""
                                                }
                                                contextLabel={contextLabel}
                                                messages={text}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
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
    </main>
  );
}
