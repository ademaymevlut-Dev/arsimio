"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveExamNotificationAction } from "@/app/teacher/actions";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StaffMessages = AppDictionary["staff"];

export function ExamNotificationDialog({
  timetableParticipantId,
  academicCalendarDayId,
  initialContent,
  contextLabel,
  messages,
}: {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  initialContent: string;
  contextLabel: string;
  messages: StaffMessages;
}) {
  const [state, action, pending] = useActionState<TeacherCtaState, FormData>(
    saveExamNotificationAction,
    {},
  );
  const hasContent = initialContent.trim().length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="xs"
          variant={hasContent ? "success" : "danger"}
        >
          {messages.examNotificationCta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.examNotificationDialogTitle}</DialogTitle>
          <DialogDescription>
            {messages.examNotificationDialogDescription}
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
            <Label htmlFor={`exam-notification-${timetableParticipantId}-${academicCalendarDayId}`}>
              {messages.examNotificationNoteLabel}
            </Label>
            <Textarea
              key={`${timetableParticipantId}:${academicCalendarDayId}:${initialContent}`}
              id={`exam-notification-${timetableParticipantId}-${academicCalendarDayId}`}
              name="content"
              defaultValue={initialContent}
              maxLength={5000}
              required
              placeholder={messages.examNotificationPlaceholder}
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
              {messages.saveExamNotification}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
