"use client";

import { useActionState } from "react";
import {
  saveTeacherProfileAction,
  transitionEmploymentAction,
} from "@/app/(school-admin)/staff/actions";
import type { StaffState } from "@/lib/staff-validation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { PersonAccountPanel } from "./person-account-panel";

type StaffMessages = AppDictionary["staff"];

type StaffDetail = {
  id: string;
  revision: string;
  staffNumber: string;
  status: string;
  type: string;
  hiredOn: string;
  endedOn: string | null;
  exitReason: string | null;
  note: string | null;
  personId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  department: string;
  position: string;
  teacherProfile: {
    category: "CLASSROOM" | "BRANCH";
    title: string;
    titleTranslations: { tr: string; sq: string; en: string };
    status: "ACTIVE" | "INACTIVE";
    note: string | null;
    subjectIds: string[];
    subjects: { id: string; name: string }[];
  } | null;
  teacherAccount: {
    id: string;
    username: string | null;
    status: string;
    mustChangePassword: boolean;
    suspendedAt: string | null;
  } | null;
  subjects: { id: string; name: string; track: string }[];
  lifecycleEvents: {
    id: string;
    type: string;
    effectiveOn: string;
    exitReason: string | null;
    note: string | null;
  }[];
};

export function StaffDetailManager({
  staff,
  canManageStaff,
  canManageTeachers,
  canManageAccounts,
  defaultEffectiveOn,
  messages,
}: {
  staff: StaffDetail;
  canManageStaff: boolean;
  canManageTeachers: boolean;
  canManageAccounts: boolean;
  defaultEffectiveOn: string;
  messages: StaffMessages;
}) {
  const [transitionState, transitionAction, transitionPending] = useActionState<
    StaffState,
    FormData
  >(transitionEmploymentAction, {});
  const [teacherState, teacherAction, teacherPending] = useActionState<
    StaffState,
    FormData
  >(saveTeacherProfileAction, {});
  function employmentStatusLabel(value: string) {
    if (value === "ACTIVE") return messages.active;
    if (value === "ON_LEAVE") return messages.onLeave;
    if (value === "ENDED") return messages.ended;
    return value;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                {messages.staffMember.toUpperCase()} #{staff.staffNumber}
              </p>
              <CardTitle className="mt-2">{staff.fullName}</CardTitle>
            </div>
            <Badge
              variant={
                staff.status === "ACTIVE"
                  ? "success"
                  : staff.status === "ON_LEAVE"
                    ? "warning"
                    : "outline"
              }
            >
              {employmentStatusLabel(staff.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.department}
              </dt>
              <dd className="mt-1 font-medium">{staff.department}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.position}
              </dt>
              <dd className="mt-1 font-medium">{staff.position}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.hiredOn}
              </dt>
              <dd className="mt-1 font-medium">{staff.hiredOn}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.phone}</dt>
              <dd className="mt-1 font-medium">{staff.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.email}</dt>
              <dd className="mt-1 font-medium">{staff.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{messages.note}</dt>
              <dd className="mt-1 font-medium">{staff.note ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canManageStaff ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{messages.statusAction}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={transitionAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <input type="hidden" name="revision" value={staff.revision} />
              <div className="space-y-2">
                <Label htmlFor="transition">{messages.action}</Label>
                <NativeSelect id="transition" name="transition" required>
                  <option value="on_leave">{messages.onLeaveAction}</option>
                  <option value="reactivate">{messages.reactivateAction}</option>
                  <option value="end">{messages.endAction}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveOn">{messages.effectiveDate}</Label>
                <Input
                  id="effectiveOn"
                  name="effectiveOn"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitReason">{messages.reason}</Label>
                <NativeSelect id="exitReason" name="exitReason">
                  <option value="">{messages.selectReason}</option>
                  <option value="MATERNITY_LEAVE">
                    {messages.maternityLeave}
                  </option>
                  <option value="RESIGNED">{messages.resigned}</option>
                  <option value="TERMINATED">{messages.terminated}</option>
                  <option value="CONTRACT_ENDED">{messages.contractEnded}</option>
                  <option value="HEALTH">{messages.health}</option>
                  <option value="RELOCATION">{messages.relocation}</option>
                  <option value="OTHER">{messages.other}</option>
                  <option value="UNKNOWN">{messages.unknown}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transitionNote">{messages.note}</Label>
                <Textarea id="transitionNote" name="note" rows={3} />
              </div>
              {transitionState.status ? (
                <Alert
                  className="sm:col-span-2"
                  variant={transitionState.status === "error" ? "danger" : "success"}
                >
                  {transitionState.message}
                </Alert>
              ) : null}
              <Button type="submit" disabled={transitionPending}>
                {messages.saveStatus}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.teacherProfile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canManageTeachers ? (
            <form action={teacherAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <div className="space-y-2">
                <Label htmlFor="category">{messages.teacherType}</Label>
                <NativeSelect
                  id="category"
                  name="category"
                  defaultValue={staff.teacherProfile?.category ?? "BRANCH"}
                >
                  <option value="CLASSROOM">{messages.classroomTeacher}</option>
                  <option value="BRANCH">{messages.branchTeacher}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherStatus">{messages.teacherStatus}</Label>
                <NativeSelect
                  id="teacherStatus"
                  name="teacherStatus"
                  defaultValue={staff.teacherProfile?.status ?? "ACTIVE"}
                >
                  <option value="ACTIVE">{messages.active}</option>
                  <option value="INACTIVE">{messages.onLeave}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  {messages.titleTranslationsHelp}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleTr">{messages.titleTr}</Label>
                <Input
                  id="titleTr"
                  name="titleTr"
                  defaultValue={staff.teacherProfile?.titleTranslations.tr ?? ""}
                  placeholder={messages.titleTrPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleSq">{messages.titleSq}</Label>
                <Input
                  id="titleSq"
                  name="titleSq"
                  defaultValue={staff.teacherProfile?.titleTranslations.sq ?? ""}
                  placeholder={messages.titleSqPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="titleEn">{messages.titleEn}</Label>
                <Input
                  id="titleEn"
                  name="titleEn"
                  defaultValue={staff.teacherProfile?.titleTranslations.en ?? ""}
                  placeholder={messages.titleEnPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{messages.subjectCapabilities}</Label>
                <div className="grid max-h-64 gap-2 overflow-auto rounded-lg border bg-background p-3 sm:grid-cols-2">
                  {staff.subjects.map((subject) => (
                    <label key={subject.id} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="subjectIds"
                        value={subject.id}
                        defaultChecked={staff.teacherProfile?.subjectIds.includes(
                          subject.id,
                        )}
                      />
                      {subject.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="teacherNote">{messages.teacherNote}</Label>
                <Textarea
                  id="teacherNote"
                  name="note"
                  defaultValue={staff.teacherProfile?.note ?? ""}
                  rows={3}
                />
              </div>
              {teacherState.status ? (
                <Alert
                  className="sm:col-span-2"
                  variant={teacherState.status === "error" ? "danger" : "success"}
                >
                  {teacherState.message}
                </Alert>
              ) : null}
              <Button type="submit" disabled={teacherPending}>
                {messages.saveTeacherProfile}
              </Button>
            </form>
          ) : staff.teacherProfile ? (
            <div className="space-y-2 text-sm">
              <p>{staff.teacherProfile.title}</p>
              <p className="text-muted-foreground">
                {staff.teacherProfile.subjects.map((s) => s.name).join(", ") ||
                  messages.noSubjectCapabilities}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {messages.noTeacherProfile}
            </p>
          )}

          {staff.teacherProfile ? (
            <PersonAccountPanel
              title={messages.teacherAccount}
              portal="TEACHER"
              personId={staff.personId}
              existingAccount={staff.teacherAccount}
              canManage={canManageAccounts}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{messages.staffHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staff.lifecycleEvents.map((event) => (
              <div key={event.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {event.effectiveOn} · {event.type}
                  {event.exitReason ? ` · ${event.exitReason}` : ""}
                </p>
                {event.note ? (
                  <p className="mt-1 text-muted-foreground">{event.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
