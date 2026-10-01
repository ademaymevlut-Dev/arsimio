import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, getSchoolLocale } from "@/i18n/server";
import { requirePortalAccount } from "@/server/accounts/portal-guards";
import { getTeacherPortalHome } from "@/server/staff/staff";

export const dynamic = "force-dynamic";

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

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
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
                <dt className="text-xs text-muted-foreground">{text.typeColumn}</dt>
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
      </div>
    </main>
  );
}
