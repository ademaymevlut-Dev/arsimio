import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HTML_LOCALES } from "@/i18n/config";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { getStudentPortalHome } from "@/server/student/student-portal";

export const dynamic = "force-dynamic";

const VIEWS = [
  "today",
  "comments",
  "schedule",
  "homework",
  "exams",
  "grades",
  "documents",
] as const;

type StudentView = (typeof VIEWS)[number];
type Search = {
  view?: string | string[];
  date?: string | string[];
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedView(value: string | string[] | undefined): StudentView {
  const candidate = single(value);
  return VIEWS.includes(candidate as StudentView)
    ? (candidate as StudentView)
    : "today";
}

function href({ view, date }: { view: StudentView; date?: string | null }) {
  const params = new URLSearchParams({ view });
  if (date) params.set("date", date);
  return `/student?${params.toString()}`;
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

type AppText = Awaited<ReturnType<typeof getDictionary>>["studentPortal"];

function weekdayLabel(weekday: string, text: AppText) {
  if (weekday === "MONDAY") return text.weekdayMonday;
  if (weekday === "TUESDAY") return text.weekdayTuesday;
  if (weekday === "WEDNESDAY") return text.weekdayWednesday;
  if (weekday === "THURSDAY") return text.weekdayThursday;
  return text.weekdayFriday;
}

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

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { tenant, account } = await requirePortalAccount("STUDENT");
  const locale = await getSchoolLocale(undefined, tenant.school.defaultLocale);
  const query = await searchParams;
  const view = selectedView(query.view);
  const dictionary = await getDictionary(locale);
  const text = dictionary.studentPortal;
  const home = await getStudentPortalHome(tenant.school.id, account.personId, {
    reportDate: single(query.date),
    timeZone: tenant.school.timezone,
    locale,
  });
  if (!home) notFound();
  const navItems: Array<{ view: StudentView; label: string }> = [
    { view: "today", label: text.todaysReport },
    { view: "comments", label: text.comments },
    { view: "schedule", label: text.weeklySchedule },
    { view: "homework", label: text.homeworks },
    { view: "exams", label: text.exams },
    { view: "grades", label: text.grades },
    { view: "documents", label: text.sourceDocuments },
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

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <PortalCard title={text.studentInformation}>
            <div>
              <h2 className="text-xl font-semibold">{home.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {text.studentNumber}: {home.studentNumber}
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.birthDate}
                </dt>
                <dd className="mt-1 font-medium">
                  {formatDate(home.birthDate, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.status}
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant={home.status === "ACTIVE" ? "success" : "warning"}
                  >
                    {home.status}
                  </Badge>
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
                  {home.academicYear ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {text.classSection}
                </dt>
                <dd className="mt-1 font-medium">
                  {home.classSection ?? "—"}
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
                    <Link href={href({ view: item.view, date: home.reportDate })}>
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

            {view === "documents" ? (
              <PortalCard title={text.sourceDocuments}>
                <EmptyState>{text.documentsPlanned}</EmptyState>
              </PortalCard>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
