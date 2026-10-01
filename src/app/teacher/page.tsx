import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
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
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
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

export default async function TeacherPortalPage() {
  const { tenant, account } = await requirePortalAccount("TEACHER");
  const locale = await getSchoolLocale(undefined, tenant.school.defaultLocale);
  const [home, dictionary] = await Promise.all([
    getTeacherPortalHome(tenant.school.id, account.personId, locale),
    getDictionary(locale),
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
            {home.weeklySchedule.periods.length === 0 ? (
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
                      {home.weeklySchedule.weekdays.map((weekday) => (
                        <TableHead key={weekday} className="min-w-56">
                          {weekdayLabel(weekday, text)}
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
                        {home.weeklySchedule.weekdays.map((weekday) => {
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
                                      className="space-y-2 rounded-lg border border-border bg-card p-2"
                                    >
                                      {session.participants.map((participant) => (
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
                                            {trackLabel(participant.track, text)}
                                          </p>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="info"
                                              disabled
                                            >
                                              {text.attendanceCta}
                                            </Button>
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="success"
                                              disabled
                                            >
                                              {text.commentCta}
                                            </Button>
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="warning"
                                              disabled
                                            >
                                              {text.homeworkCta}
                                            </Button>
                                          </div>
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
      </div>
    </main>
  );
}
