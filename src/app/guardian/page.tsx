import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HTML_LOCALES } from "@/i18n/config";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { validSchoolId } from "@/lib/platform-school-validation";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { getGuardianPortalHome } from "@/server/guardian/guardian-portal";

export const dynamic = "force-dynamic";

const VIEWS = [
  "today",
  "comments",
  "schedule",
  "homework",
  "exams",
  "grades",
  "finance",
] as const;

type GuardianView = (typeof VIEWS)[number];
type Search = {
  student?: string | string[];
  view?: string | string[];
  date?: string | string[];
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedView(value: string | string[] | undefined): GuardianView {
  const candidate = single(value);
  return VIEWS.includes(candidate as GuardianView)
    ? (candidate as GuardianView)
    : "today";
}

function href({
  studentId,
  view,
  date,
}: {
  studentId: string;
  view: GuardianView;
  date?: string | null;
}) {
  const params = new URLSearchParams({ student: studentId, view });
  if (date) params.set("date", date);
  return `/guardian?${params.toString()}`;
}

function formatDate(
  value: string | null,
  locale: keyof typeof HTML_LOCALES,
) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(HTML_LOCALES[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function weekdayLabel(weekday: string, text: AppText) {
  if (weekday === "MONDAY") return text.weekdayMonday;
  if (weekday === "TUESDAY") return text.weekdayTuesday;
  if (weekday === "WEDNESDAY") return text.weekdayWednesday;
  if (weekday === "THURSDAY") return text.weekdayThursday;
  return text.weekdayFriday;
}

type AppText = Awaited<ReturnType<typeof getDictionary>>["guardianPortal"];

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function PortalCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function RecordCard({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </article>
  );
}

export default async function GuardianPortalPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { tenant, account } = await requirePortalAccount("GUARDIAN");
  const locale = await getSchoolLocale(undefined, tenant.school.defaultLocale);
  const query = await searchParams;
  const studentParam = single(query.student);
  const studentId = validSchoolId(studentParam) ? studentParam : null;
  const view = selectedView(query.view);
  const dictionary = await getDictionary(locale);
  const text = dictionary.guardianPortal;
  const home = await getGuardianPortalHome(tenant.school.id, account.personId, {
    selectedStudentId: studentId,
    reportDate: single(query.date),
    timeZone: tenant.school.timezone,
    locale,
  });
  if (!home) notFound();
  const selected = home.selectedChild;
  const navItems: Array<{ view: GuardianView; label: string }> = [
    { view: "today", label: text.todaysReport },
    { view: "comments", label: text.comments },
    { view: "schedule", label: text.weeklySchedule },
    { view: "homework", label: text.homeworks },
    { view: "exams", label: text.exams },
    { view: "grades", label: text.grades },
    { view: "finance", label: text.finance },
  ];

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
              {text.eyebrow}
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

        {home.children.length > 1 ? (
          <PortalCard title={text.selectChild}>
            <div className="grid gap-3 md:grid-cols-3">
              {home.children.map((child) => {
                const isSelected =
                  child.studentProfileId === selected.studentProfileId;
                return (
                  <Link
                    key={child.relationshipId}
                    href={href({
                      studentId: child.studentProfileId,
                      view,
                      date: home.reportDate,
                    })}
                    className={
                      isSelected
                        ? "rounded-lg border border-primary bg-primary/10 p-4"
                        : "rounded-lg border bg-card p-4 hover:bg-muted/40"
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{child.fullName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {text.studentNumber}: {child.studentNumber}
                        </p>
                      </div>
                      {isSelected ? (
                        <Badge variant="success">{text.selected}</Badge>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </PortalCard>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <PortalCard title={text.studentInformation}>
            <div>
              <h2 className="text-xl font-semibold">{selected.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {text.studentNumber}: {selected.studentNumber}
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.birthDate}
                </dt>
                <dd className="mt-1 font-medium">
                  {formatDate(selected.birthDate, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.status}
                </dt>
                <dd className="mt-1">
                  <Badge variant="success">{selected.status}</Badge>
                </dd>
              </div>
            </dl>
          </PortalCard>

          <PortalCard title={text.activeClass}>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.academicYear}
                </dt>
                <dd className="mt-1 font-medium">
                  {selected.academicYear ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.classSection}
                </dt>
                <dd className="mt-1 font-medium">
                  {selected.classSection ?? "—"}
                </dd>
              </div>
            </dl>
          </PortalCard>

          <PortalCard title={text.attendance}>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">
                  {text.absent}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {home.attendanceSummary.absent}
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">{text.late}</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {home.attendanceSummary.late}
                </dd>
              </div>
            </dl>
          </PortalCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <PortalCard title={text.menu}>
              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <Button
                    key={item.view}
                    asChild
                    variant={view === item.view ? "default" : "outline"}
                    className="justify-start"
                  >
                    <Link
                      href={href({
                        studentId: selected.studentProfileId,
                        view: item.view,
                        date: home.reportDate,
                      })}
                    >
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </PortalCard>

            <PortalCard title={text.upcomingExams}>
              {home.upcomingExams.length === 0 ? (
                <EmptyState>{text.noUpcomingExams}</EmptyState>
              ) : (
                <div className="space-y-3">
                  {home.upcomingExams.slice(0, 4).map((exam) => (
                    <div key={exam.id} className="rounded-lg border p-3">
                      <p className="font-medium">
                        {formatDate(exam.date, locale)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exam.period} · {exam.subject}
                      </p>
                      <p className="mt-2 text-sm">{exam.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </PortalCard>
          </aside>

          <section className="space-y-4">
            {view === "today" ? (
              <PortalCard title={text.todaysReport}>
                <form className="flex flex-wrap items-end gap-3">
                  <input
                    type="hidden"
                    name="student"
                    value={selected.studentProfileId}
                  />
                  <input type="hidden" name="view" value="today" />
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">
                      {text.reportDate}
                    </span>
                    <input
                      type="date"
                      name="date"
                      defaultValue={home.reportDate}
                      className="h-9 rounded-lg border bg-background px-3"
                    />
                  </label>
                  <Button type="submit">{text.reload}</Button>
                </form>

                <div className="space-y-3">
                  <h3 className="font-medium">{text.lessonTopics}</h3>
                  {home.daily.lessonTopics.length === 0 ? (
                    <EmptyState>{text.noDailyTopics}</EmptyState>
                  ) : (
                    home.daily.lessonTopics.map((entry) => (
                      <RecordCard
                        key={entry.id}
                        title={entry.subject}
                        meta={`${entry.period} · ${entry.teacher}`}
                      >
                        <p>{entry.content}</p>
                      </RecordCard>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">{text.teacherComments}</h3>
                  {home.daily.comments.length === 0 ? (
                    <EmptyState>{text.noDailyComments}</EmptyState>
                  ) : (
                    home.daily.comments.map((entry) => (
                      <RecordCard
                        key={entry.id}
                        title={entry.subject}
                        meta={`${entry.teacher} · ${entry.category}`}
                      >
                        <p>{entry.content}</p>
                      </RecordCard>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">{text.dailyHomework}</h3>
                  {home.daily.homework.length === 0 ? (
                    <EmptyState>{text.noDailyHomework}</EmptyState>
                  ) : (
                    home.daily.homework.map((entry) => (
                      <RecordCard
                        key={entry.id}
                        title={`${entry.subject} · ${entry.title}`}
                        meta={entry.teacher}
                      >
                        <p>{entry.content}</p>
                      </RecordCard>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">{text.dailyAttendance}</h3>
                  {home.daily.attendance.length === 0 ? (
                    <EmptyState>{text.noDailyAttendance}</EmptyState>
                  ) : (
                    home.daily.attendance.map((entry) => (
                      <RecordCard
                        key={entry.id}
                        title={`${entry.status} · ${entry.subject}`}
                        meta={`${entry.period} · ${entry.teacher}`}
                      >
                        <p>{formatDate(entry.date, locale)}</p>
                      </RecordCard>
                    ))
                  )}
                </div>
              </PortalCard>
            ) : null}

            {view === "comments" ? (
              <PortalCard title={text.commentHistory}>
                {home.commentHistory.length === 0 ? (
                  <EmptyState>{text.noComments}</EmptyState>
                ) : (
                  home.commentHistory.map((entry) => (
                    <RecordCard
                      key={entry.id}
                      title={`${entry.subject} · ${formatDate(entry.date, locale)}`}
                      meta={`${entry.teacher} · ${entry.category}`}
                    >
                      <p>{entry.content}</p>
                    </RecordCard>
                  ))
                )}
              </PortalCard>
            ) : null}

            {view === "homework" ? (
              <PortalCard title={text.homeworkHistory}>
                {home.homeworkHistory.length === 0 ? (
                  <EmptyState>{text.noHomework}</EmptyState>
                ) : (
                  home.homeworkHistory.map((entry) => (
                    <RecordCard
                      key={entry.id}
                      title={`${entry.subject} · ${entry.title}`}
                      meta={`${formatDate(entry.date, locale)} · ${entry.teacher}`}
                    >
                      <p>{entry.content}</p>
                    </RecordCard>
                  ))
                )}
              </PortalCard>
            ) : null}

            {view === "exams" ? (
              <PortalCard title={text.upcomingExams}>
                {home.upcomingExams.length === 0 ? (
                  <EmptyState>{text.noUpcomingExams}</EmptyState>
                ) : (
                  home.upcomingExams.map((exam) => (
                    <RecordCard
                      key={exam.id}
                      title={`${formatDate(exam.date, locale)} · ${exam.subject}`}
                      meta={exam.period}
                    >
                      <p>{exam.content}</p>
                    </RecordCard>
                  ))
                )}
              </PortalCard>
            ) : null}

            {view === "schedule" ? (
              <PortalCard title={text.weeklySchedule}>
                {home.weeklySchedule.length === 0 ? (
                  <EmptyState>{text.noSchedule}</EmptyState>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {home.weeklySchedule.map((entry) => (
                      <RecordCard
                        key={entry.id}
                        title={`${weekdayLabel(entry.weekday, text)} · ${entry.period}`}
                        meta={`${entry.startTime}–${entry.endTime}`}
                      >
                        <p className="font-medium text-foreground">
                          {entry.subject}
                        </p>
                        <p className="mt-1">{entry.teacher}</p>
                      </RecordCard>
                    ))}
                  </div>
                )}
              </PortalCard>
            ) : null}

            {view === "grades" ? (
              <PortalCard title={text.grades}>
                <EmptyState>{text.gradesPlanned}</EmptyState>
              </PortalCard>
            ) : null}

            {view === "finance" ? (
              <PortalCard title={text.finance}>
                <EmptyState>{text.financePlanned}</EmptyState>
              </PortalCard>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
