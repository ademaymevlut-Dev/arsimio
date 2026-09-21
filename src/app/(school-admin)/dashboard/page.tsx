import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSchoolPermission } from "@/server/authorization/guards";
import { getAcademicCalendarSummary } from "@/server/academics/academic-calendar";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getSchoolLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, tenant, membership, permissions } =
    await requireSchoolPermission("dashboard.read");
  const academic = await getAcademicCalendarSummary(tenant.school.id);
  const locale = await getSchoolLocale(
    membership.preferredLocale,
    tenant.school.defaultLocale,
  );
  const dictionary = await getDictionary(locale);
  const messages = dictionary.dashboard;
  const roleNames = membership.roles.map(({ role }) => role.name);
  const setup = [
    {
      title: messages.adminTitle,
      description: messages.adminDescription,
      status: messages.statusReady,
      variant: "success" as const,
      icon: ShieldCheck,
    },
    {
      title: messages.calendarTitle,
      description: academic.yearCount
        ? formatMessage(messages.yearsDefined, { count: academic.yearCount })
        : messages.calendarNext,
      status: academic.yearCount ? messages.statusReady : messages.statusNext,
      variant: academic.yearCount ? ("success" as const) : ("info" as const),
      icon: CalendarDays,
    },
    {
      title: messages.usersTitle,
      description: messages.usersDescription,
      status: messages.statusPlanned,
      variant: "secondary" as const,
      icon: UsersRound,
    },
    {
      title: messages.classesTitle,
      description: messages.classesDescription,
      status: messages.statusWaiting,
      variant: "outline" as const,
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={formatMessage(messages.description, {
          name: tenant.school.name,
        })}
      />
      <section
        className="grid gap-4 md:grid-cols-3"
        aria-label={messages.accountSummary}
      >
        {[
          {
            label: messages.sessionOwner,
            value:
              user.firstName ?? membership.username ?? messages.sessionOwner,
            note: membership.username ?? messages.usernameMissing,
            icon: KeyRound,
          },
          {
            label: messages.managementRole,
            value: roleNames.join(" · ") || messages.roleMissing,
            note: formatMessage(messages.activePermissions, {
              count: permissions.length,
            }),
            icon: ShieldCheck,
          },
          {
            label: messages.academicSetup,
            value: academic.activeYear?.name ?? messages.readyToStart,
            note: academic.activeYear
              ? messages.activeAcademicYear
              : academic.yearCount
                ? messages.activateDraft
                : messages.firstStep,
            icon: Clock3,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="py-5">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-5 break-words text-lg font-medium text-foreground">
                {value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="flex flex-col gap-4 rounded-xl border border-success-border bg-success px-5 py-5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card/70 text-success-foreground">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-medium text-success-foreground">
            {messages.readyTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-success-foreground/85">
            {messages.readyDescription}
          </p>
        </div>
      </section>
      <DataTableShell
        title={messages.roadmap}
        description={messages.roadmapDescription}
        footer={messages.roadmapFooter}
      >
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">{messages.step}</TableHead>
              <TableHead scope="col">{messages.descriptionColumn}</TableHead>
              <TableHead scope="col">{dictionary.common.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setup.map(({ title, description, status, variant, icon: Icon }) => (
              <TableRow key={title}>
                <TableCell>
                  <span className="flex items-center gap-3 font-medium">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {title}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {description}
                </TableCell>
                <TableCell>
                  <Badge variant={variant}>{status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}
