"use client";

import { useActionState } from "react";
import {
  saveStaffCatalogItemAction,
  transitionStaffCatalogItemAction,
} from "@/app/(school-admin)/staff/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
import type { StaffCatalogItem } from "@/server/staff/staff";
import type { StaffCatalogKind, StaffState } from "@/lib/staff-validation";

type StaffMessages = AppDictionary["staff"];
type CommonMessages = AppDictionary["common"];

function CatalogFields({
  item,
  messages,
  prefix,
  disabled,
}: {
  item?: StaffCatalogItem;
  messages: StaffMessages;
  prefix: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-code`}>{messages.catalogCode}</Label>
        <Input
          id={`${prefix}-code`}
          name="code"
          defaultValue={item?.code ?? ""}
          placeholder={messages.codePlaceholder}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-tr`}>{messages.nameTr}</Label>
        <Input
          id={`${prefix}-tr`}
          name="nameTr"
          defaultValue={item?.names.tr ?? ""}
          placeholder={messages.nameTrPlaceholder}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-sq`}>{messages.nameSq}</Label>
        <Input
          id={`${prefix}-sq`}
          name="nameSq"
          defaultValue={item?.names.sq ?? ""}
          placeholder={messages.nameSqPlaceholder}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-en`}>{messages.nameEn}</Label>
        <Input
          id={`${prefix}-en`}
          name="nameEn"
          defaultValue={item?.names.en ?? ""}
          placeholder={messages.nameEnPlaceholder}
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}

function CatalogSection({
  kind,
  title,
  createLabel,
  emptyLabel,
  items,
  messages,
  common,
  canManage,
  saveAction,
  transitionAction,
  savePending,
  transitionPending,
}: {
  kind: StaffCatalogKind;
  title: string;
  createLabel: string;
  emptyLabel: string;
  items: StaffCatalogItem[];
  messages: StaffMessages;
  common: CommonMessages;
  canManage: boolean;
  saveAction: (formData: FormData) => void;
  transitionAction: (formData: FormData) => void;
  savePending: boolean;
  transitionPending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{messages.catalogSectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {canManage ? (
          <form action={saveAction} className="space-y-3 rounded-lg border p-4">
            <input type="hidden" name="catalogKind" value={kind} />
            <p className="text-sm font-medium">{createLabel}</p>
            <CatalogFields
              messages={messages}
              prefix={`${kind}-new`}
              disabled={savePending}
            />
            <Button type="submit" disabled={savePending}>
              {createLabel}
            </Button>
          </form>
        ) : (
          <Alert variant="info">{common.readOnly}</Alert>
        )}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <Badge variant={item.archived ? "outline" : "success"}>
                        {item.archived ? messages.archived : messages.activeCatalog}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatMessage(messages.catalogUsage, {
                        count: item.employmentCount,
                      })}
                    </p>
                  </div>
                  {canManage ? (
                    <form action={transitionAction}>
                      <input type="hidden" name="catalogKind" value={kind} />
                      <input type="hidden" name="catalogId" value={item.id} />
                      <input
                        type="hidden"
                        name="revision"
                        value={item.revision}
                      />
                      <input
                        type="hidden"
                        name="transition"
                        value={item.archived ? "restore" : "archive"}
                      />
                      <Button
                        type="submit"
                        variant={item.archived ? "outline" : "ghost"}
                        disabled={transitionPending}
                      >
                        {item.archived ? common.restore : common.archive}
                      </Button>
                    </form>
                  ) : null}
                </div>

                <form action={saveAction} className="space-y-3">
                  <input type="hidden" name="catalogKind" value={kind} />
                  <input type="hidden" name="catalogId" value={item.id} />
                  <input type="hidden" name="revision" value={item.revision} />
                  <CatalogFields
                    item={item}
                    messages={messages}
                    prefix={`${kind}-${item.id}`}
                    disabled={!canManage || savePending}
                  />
                  {canManage ? (
                    <Button type="submit" variant="outline" disabled={savePending}>
                      {common.save}
                    </Button>
                  ) : null}
                </form>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StaffCatalogManager({
  departments,
  positions,
  messages,
  common,
  canManage,
}: {
  departments: StaffCatalogItem[];
  positions: StaffCatalogItem[];
  messages: StaffMessages;
  common: CommonMessages;
  canManage: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState<
    StaffState,
    FormData
  >(saveStaffCatalogItemAction, {});
  const [transitionState, transitionAction, transitionPending] = useActionState<
    StaffState,
    FormData
  >(transitionStaffCatalogItemAction, {});

  return (
    <div className="space-y-6">
      <Alert variant="info">{messages.catalogFormHelp}</Alert>
      {saveState.status ? (
        <Alert variant={saveState.status === "error" ? "danger" : "success"}>
          {saveState.message}
        </Alert>
      ) : null}
      {transitionState.status ? (
        <Alert
          variant={transitionState.status === "error" ? "danger" : "success"}
        >
          {transitionState.message}
        </Alert>
      ) : null}
      <CatalogSection
        kind="department"
        title={messages.departmentsTitle}
        createLabel={messages.createDepartment}
        emptyLabel={messages.noDepartments}
        items={departments}
        messages={messages}
        common={common}
        canManage={canManage}
        saveAction={saveAction}
        transitionAction={transitionAction}
        savePending={savePending}
        transitionPending={transitionPending}
      />
      <CatalogSection
        kind="position"
        title={messages.positionsTitle}
        createLabel={messages.createPosition}
        emptyLabel={messages.noPositions}
        items={positions}
        messages={messages}
        common={common}
        canManage={canManage}
        saveAction={saveAction}
        transitionAction={transitionAction}
        savePending={savePending}
        transitionPending={transitionPending}
      />
    </div>
  );
}
