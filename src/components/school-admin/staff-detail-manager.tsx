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
import { PersonAccountPanel } from "./person-account-panel";

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
}: {
  staff: StaffDetail;
  canManageStaff: boolean;
  canManageTeachers: boolean;
  canManageAccounts: boolean;
  defaultEffectiveOn: string;
}) {
  const [transitionState, transitionAction, transitionPending] = useActionState<
    StaffState,
    FormData
  >(transitionEmploymentAction, {});
  const [teacherState, teacherAction, teacherPending] = useActionState<
    StaffState,
    FormData
  >(saveTeacherProfileAction, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                PERSONEL #{staff.staffNumber}
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
              {staff.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Departman</dt>
              <dd className="mt-1 font-medium">{staff.department}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pozisyon</dt>
              <dd className="mt-1 font-medium">{staff.position}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ise giris</dt>
              <dd className="mt-1 font-medium">{staff.hiredOn}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telefon</dt>
              <dd className="mt-1 font-medium">{staff.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-posta</dt>
              <dd className="mt-1 font-medium">{staff.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Not</dt>
              <dd className="mt-1 font-medium">{staff.note ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canManageStaff ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Durum islemi</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={transitionAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <input type="hidden" name="revision" value={staff.revision} />
              <div className="space-y-2">
                <Label htmlFor="transition">Islem</Label>
                <NativeSelect id="transition" name="transition" required>
                  <option value="on_leave">Izin / pasif duruma al</option>
                  <option value="reactivate">Yeniden aktif yap</option>
                  <option value="end">Is akdini kapat</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveOn">Tarih</Label>
                <Input
                  id="effectiveOn"
                  name="effectiveOn"
                  type="date"
                  defaultValue={defaultEffectiveOn}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitReason">Sebep</Label>
                <NativeSelect id="exitReason" name="exitReason">
                  <option value="">Sebep secin</option>
                  <option value="MATERNITY_LEAVE">Dogum / uzun izin</option>
                  <option value="RESIGNED">Kendi istegiyle ayrildi</option>
                  <option value="TERMINATED">Isten cikarildi</option>
                  <option value="CONTRACT_ENDED">Sozlesme bitti</option>
                  <option value="HEALTH">Saglik</option>
                  <option value="RELOCATION">Tasinma</option>
                  <option value="OTHER">Diger</option>
                  <option value="UNKNOWN">Belirtilmedi</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transitionNote">Not</Label>
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
                Durumu kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Ogretmen profili</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canManageTeachers ? (
            <form action={teacherAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employmentId" value={staff.id} />
              <div className="space-y-2">
                <Label htmlFor="category">Ogretmen turu</Label>
                <NativeSelect
                  id="category"
                  name="category"
                  defaultValue={staff.teacherProfile?.category ?? "BRANCH"}
                >
                  <option value="CLASSROOM">Sinif ogretmeni</option>
                  <option value="BRANCH">Brans ogretmeni</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherStatus">Durum</Label>
                <NativeSelect
                  id="teacherStatus"
                  name="teacherStatus"
                  defaultValue={staff.teacherProfile?.status ?? "ACTIVE"}
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Ana unvan</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={staff.teacherProfile?.title ?? ""}
                  placeholder="Tarih Ogretmeni"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Ders yetkinlikleri</Label>
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
                <Label htmlFor="teacherNote">Ogretmen notu</Label>
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
                Ogretmen profilini kaydet
              </Button>
            </form>
          ) : staff.teacherProfile ? (
            <div className="space-y-2 text-sm">
              <p>{staff.teacherProfile.title}</p>
              <p className="text-muted-foreground">
                {staff.teacherProfile.subjects.map((s) => s.name).join(", ") ||
                  "Ders yetkinligi secilmedi."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bu personel icin ogretmen profili yok.
            </p>
          )}

          {staff.teacherProfile ? (
            <PersonAccountPanel
              title="Ogretmen giris hesabi"
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
          <CardTitle>Personel gecmisi</CardTitle>
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
