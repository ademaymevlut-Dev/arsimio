"use client";

import { useActionState } from "react";
import {
  saveContractTemplateAction,
  saveContractTemplateClauseAction,
  transitionContractTemplateAction,
  transitionContractTemplateClauseAction,
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { StaffState } from "@/lib/staff-validation";
import type { StaffContractTemplate } from "@/server/staff/staff";

type StaffMessages = AppDictionary["staff"];
type CommonMessages = AppDictionary["common"];

const initialState: StaffState = {};

function StateAlert({ state }: { state: StaffState }) {
  if (!state.status) return null;
  return (
    <Alert variant={state.status === "error" ? "danger" : "success"}>
      {state.message}
    </Alert>
  );
}

function FieldError({
  state,
  field,
}: {
  state: StaffState;
  field: keyof NonNullable<StaffState["fieldErrors"]>;
}) {
  const message = state.fieldErrors?.[field];
  return message ? <p className="text-xs text-danger-foreground">{message}</p> : null;
}

function LocaleOptions({ messages }: { messages: StaffMessages }) {
  return (
    <>
      <option value="sq">{messages.localeSq}</option>
      <option value="tr">{messages.localeTr}</option>
      <option value="en">{messages.localeEn}</option>
    </>
  );
}

function TemplateFields({
  template,
  messages,
  prefix,
  disabled,
}: {
  template?: StaffContractTemplate;
  messages: StaffMessages;
  prefix: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-code`}>{messages.templateCode}</Label>
        <Input
          id={`${prefix}-code`}
          name="templateCode"
          defaultValue={template?.code ?? ""}
          placeholder="PRAKTIKE_2026"
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-locale`}>{messages.templateLocale}</Label>
        <NativeSelect
          id={`${prefix}-locale`}
          name="templateLocale"
          defaultValue={template?.locale ?? "sq"}
          disabled={disabled}
        >
          <LocaleOptions messages={messages} />
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${prefix}-title`}>{messages.templateTitle}</Label>
        <Input
          id={`${prefix}-title`}
          name="templateTitle"
          defaultValue={template?.title ?? ""}
          placeholder={messages.templateTitlePlaceholder}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-header`}>{messages.templateHeader}</Label>
        <Textarea
          id={`${prefix}-header`}
          name="templateHeader"
          defaultValue={template?.headerText ?? ""}
          rows={4}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-footer`}>{messages.templateFooter}</Label>
        <Textarea
          id={`${prefix}-footer`}
          name="templateFooter"
          defaultValue={template?.footerText ?? ""}
          rows={4}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${prefix}-note`}>{messages.templateNote}</Label>
        <Textarea
          id={`${prefix}-note`}
          name="templateNote"
          defaultValue={template?.note ?? ""}
          rows={3}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ClauseFields({
  clause,
  messages,
  prefix,
  disabled,
}: {
  clause?: StaffContractTemplate["clauses"][number];
  messages: StaffMessages;
  prefix: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-order`}>{messages.clauseOrder}</Label>
        <Input
          id={`${prefix}-order`}
          name="clauseOrder"
          type="number"
          min={1}
          max={999}
          defaultValue={clause?.sortOrder ?? 1}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-title`}>{messages.clauseTitle}</Label>
        <Input
          id={`${prefix}-title`}
          name="clauseTitle"
          defaultValue={clause?.title ?? ""}
          placeholder={messages.clauseTitlePlaceholder}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${prefix}-body`}>{messages.clauseBody}</Label>
        <Textarea
          id={`${prefix}-body`}
          name="clauseBody"
          defaultValue={clause?.body ?? ""}
          rows={5}
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}

export function StaffContractTemplateManager({
  templates,
  messages,
  common,
  canManage,
}: {
  templates: StaffContractTemplate[];
  messages: StaffMessages;
  common: CommonMessages;
  canManage: boolean;
}) {
  const [templateState, templateAction, templatePending] = useActionState<
    StaffState,
    FormData
  >(saveContractTemplateAction, initialState);
  const [templateTransitionState, templateTransitionAction, templateTransitionPending] =
    useActionState<StaffState, FormData>(
      transitionContractTemplateAction,
      initialState,
    );
  const [clauseState, clauseAction, clausePending] = useActionState<
    StaffState,
    FormData
  >(saveContractTemplateClauseAction, initialState);
  const [clauseTransitionState, clauseTransitionAction, clauseTransitionPending] =
    useActionState<StaffState, FormData>(
      transitionContractTemplateClauseAction,
      initialState,
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.contractTemplateSettingsTitle}</CardTitle>
        <CardDescription>
          {messages.contractTemplateSettingsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="info">{messages.contractTemplateHelp}</Alert>
        <StateAlert state={templateState} />
        <StateAlert state={templateTransitionState} />
        <StateAlert state={clauseState} />
        <StateAlert state={clauseTransitionState} />

        {canManage ? (
          <form action={templateAction} className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{messages.createContractTemplate}</p>
            <TemplateFields
              messages={messages}
              prefix="template-new"
              disabled={templatePending}
            />
            <div className="space-y-1">
              <FieldError state={templateState} field="templateCode" />
              <FieldError state={templateState} field="templateTitle" />
            </div>
            <Button type="submit" disabled={templatePending}>
              {messages.createContractTemplate}
            </Button>
          </form>
        ) : (
          <Alert variant="info">{common.readOnly}</Alert>
        )}

        {templates.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {messages.noContractTemplates}
          </p>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <details key={template.id} className="rounded-lg border p-4">
                <summary className="cursor-pointer">
                  <span className="font-medium">{template.title}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {template.code} · {template.locale.toUpperCase()}
                  </span>
                  <Badge
                    className="ml-2"
                    variant={template.archived ? "outline" : "success"}
                  >
                    {template.archived ? messages.archived : messages.activeCatalog}
                  </Badge>
                </summary>

                <div className="mt-4 space-y-5">
                  <p className="text-xs text-muted-foreground">
                    {template.contractCount} {messages.contractTemplateUsage}
                  </p>

                  <form action={templateAction} className="space-y-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <input type="hidden" name="revision" value={template.revision} />
                    <TemplateFields
                      template={template}
                      messages={messages}
                      prefix={`template-${template.id}`}
                      disabled={!canManage || templatePending}
                    />
                    {canManage ? (
                      <Button type="submit" variant="outline" disabled={templatePending}>
                        {common.save}
                      </Button>
                    ) : null}
                  </form>

                  {canManage ? (
                    <form action={templateTransitionAction}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="revision" value={template.revision} />
                      <input
                        type="hidden"
                        name="transition"
                        value={template.archived ? "restore" : "archive"}
                      />
                      <Button
                        type="submit"
                        variant={template.archived ? "outline" : "ghost"}
                        disabled={templateTransitionPending}
                      >
                        {template.archived ? common.restore : common.archive}
                      </Button>
                    </form>
                  ) : null}

                  {canManage ? (
                    <form
                      action={clauseAction}
                      className="space-y-3 rounded-lg border bg-muted/20 p-4"
                    >
                      <input type="hidden" name="templateId" value={template.id} />
                      <p className="text-sm font-medium">{messages.addContractClause}</p>
                      <ClauseFields
                        messages={messages}
                        prefix={`clause-new-${template.id}`}
                        disabled={clausePending}
                      />
                      <div className="space-y-1">
                        <FieldError state={clauseState} field="clauseOrder" />
                        <FieldError state={clauseState} field="clauseTitle" />
                        <FieldError state={clauseState} field="clauseBody" />
                      </div>
                      <Button type="submit" disabled={clausePending}>
                        {messages.addContractClause}
                      </Button>
                    </form>
                  ) : null}

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">
                      {messages.contractClauses}
                    </h3>
                    {template.clauses.length ? (
                      template.clauses.map((clause) => (
                        <details key={clause.id} className="rounded-lg border p-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            {clause.sortOrder}. {clause.title}
                            <Badge
                              className="ml-2"
                              variant={clause.archived ? "outline" : "success"}
                            >
                              {clause.archived
                                ? messages.archived
                                : messages.activeCatalog}
                            </Badge>
                          </summary>
                          <form action={clauseAction} className="mt-3 space-y-3">
                            <input
                              type="hidden"
                              name="templateId"
                              value={template.id}
                            />
                            <input type="hidden" name="clauseId" value={clause.id} />
                            <input
                              type="hidden"
                              name="revision"
                              value={clause.revision}
                            />
                            <ClauseFields
                              clause={clause}
                              messages={messages}
                              prefix={`clause-${clause.id}`}
                              disabled={!canManage || clausePending}
                            />
                            {canManage ? (
                              <Button
                                type="submit"
                                variant="outline"
                                disabled={clausePending}
                              >
                                {common.save}
                              </Button>
                            ) : null}
                          </form>
                          {canManage ? (
                            <form action={clauseTransitionAction} className="mt-2">
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              <input type="hidden" name="clauseId" value={clause.id} />
                              <input
                                type="hidden"
                                name="revision"
                                value={clause.revision}
                              />
                              <input
                                type="hidden"
                                name="transition"
                                value={clause.archived ? "restore" : "archive"}
                              />
                              <Button
                                type="submit"
                                variant={clause.archived ? "outline" : "ghost"}
                                disabled={clauseTransitionPending}
                              >
                                {clause.archived ? common.restore : common.archive}
                              </Button>
                            </form>
                          ) : null}
                        </details>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        {messages.noContractClauses}
                      </p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
