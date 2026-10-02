"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveHomeworkAction } from "@/app/teacher/actions";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type { TeacherCtaState } from "@/lib/teacher-cta-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StaffMessages = AppDictionary["staff"];

export function HomeworkDialog({
  timetableParticipantId,
  academicCalendarDayId,
  initialTitle,
  initialContent,
  contextLabel,
  messages,
}: {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  initialTitle: string;
  initialContent: string;
  contextLabel: string;
  messages: StaffMessages;
}) {
  const [state, action, pending] = useActionState<TeacherCtaState, FormData>(
    saveHomeworkAction,
    {},
  );
  const hasContent =
    initialTitle.trim().length > 0 || initialContent.trim().length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="xs"
          variant={hasContent ? "success" : "warning"}
        >
          {messages.homeworkCta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.homeworkDialogTitle}</DialogTitle>
          <DialogDescription>
            {messages.homeworkDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {contextLabel}
        </div>
        <form action={action} className="space-y-4">
          <input
            type="hidden"
            name="timetableParticipantId"
            value={timetableParticipantId}
          />
          <input
            type="hidden"
            name="academicCalendarDayId"
            value={academicCalendarDayId}
          />
          <div className="space-y-2">
            <Label htmlFor={`homework-title-${timetableParticipantId}-${academicCalendarDayId}`}>
              {messages.homeworkTitleLabel}
            </Label>
            <Input
              key={`${timetableParticipantId}:${academicCalendarDayId}:${initialTitle}:title`}
              id={`homework-title-${timetableParticipantId}-${academicCalendarDayId}`}
              name="title"
              defaultValue={initialTitle}
              maxLength={200}
              required
              placeholder={messages.homeworkTitlePlaceholder}
              aria-invalid={Boolean(state.fieldErrors?.title)}
            />
            {state.fieldErrors?.title ? (
              <p className="text-sm text-danger-foreground">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`homework-content-${timetableParticipantId}-${academicCalendarDayId}`}>
              {messages.homeworkNoteLabel}
            </Label>
            <Textarea
              key={`${timetableParticipantId}:${academicCalendarDayId}:${initialContent}:content`}
              id={`homework-content-${timetableParticipantId}-${academicCalendarDayId}`}
              name="content"
              defaultValue={initialContent}
              maxLength={5000}
              required
              placeholder={messages.homeworkPlaceholder}
              aria-invalid={Boolean(state.fieldErrors?.content)}
              className="min-h-40"
            />
            {state.fieldErrors?.content ? (
              <p className="text-sm text-danger-foreground">
                {state.fieldErrors.content}
              </p>
            ) : null}
          </div>
          {state.message ? (
            <Alert
              variant={state.status === "success" ? "success" : "danger"}
              role="status"
            >
              <AlertDescription className="mt-0">
                {state.message}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {messages.lessonTopicClose}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {messages.saveHomework}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
