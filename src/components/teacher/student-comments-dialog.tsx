"use client";

import { useActionState, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveStudentCommentsAction } from "@/app/teacher/actions";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type {
  StudentCommentCategoryInput,
  TeacherCtaState,
} from "@/lib/teacher-cta-validation";
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

type StudentOption = {
  id: string;
  studentNumber: string;
  fullName: string;
};

type ExistingComment = {
  studentProfileId: string;
  category: StudentCommentCategoryInput;
  point: number;
  content: string;
};

function selectedCountLabel(template: string, count: number) {
  return template.replace("{count}", String(count));
}

export function StudentCommentsDialog({
  timetableParticipantId,
  academicCalendarDayId,
  students,
  existingComments,
  contextLabel,
  messages,
}: {
  timetableParticipantId: string;
  academicCalendarDayId: string;
  students: StudentOption[];
  existingComments: ExistingComment[];
  contextLabel: string;
  messages: StaffMessages;
}) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [state, action, pending] = useActionState<TeacherCtaState, FormData>(
    saveStudentCommentsAction,
    {},
  );
  const existingByStudentId = useMemo(
    () =>
      new Map(
        existingComments.map((comment) => [
          comment.studentProfileId,
          comment,
        ]),
      ),
    [existingComments],
  );
  const allSelected =
    students.length > 0 && selectedStudentIds.size === students.length;
  const categories: Array<{
    value: StudentCommentCategoryInput;
    label: string;
    point: number;
  }> = [
    {
      value: "GREEN_CARD",
      label: messages.commentCategoryGreenCard,
      point: 3,
    },
    {
      value: "POSITIVE",
      label: messages.commentCategoryPositive,
      point: 1,
    },
    {
      value: "INFORMATION",
      label: messages.commentCategoryInformation,
      point: 0,
    },
    {
      value: "NEGATIVE",
      label: messages.commentCategoryNegative,
      point: -1,
    },
    {
      value: "RED_CARD",
      label: messages.commentCategoryRedCard,
      point: -3,
    },
  ];

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  }

  function toggleAllStudents() {
    setSelectedStudentIds(() =>
      allSelected ? new Set() : new Set(students.map((student) => student.id)),
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="xs" variant="success">
          {messages.commentCta}
          {existingComments.length > 0 ? ` (${existingComments.length})` : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{messages.studentCommentsDialogTitle}</DialogTitle>
          <DialogDescription>
            {messages.studentCommentsDialogDescription}
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
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_1.3fr]">
            <section className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-primary">
                    {messages.commentStudentsColumn}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedCountLabel(
                      messages.selectedStudentsCount,
                      selectedStudentIds.size,
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={toggleAllStudents}
                  disabled={students.length === 0 || pending}
                >
                  {allSelected
                    ? messages.clearStudentSelection
                    : messages.selectAllStudents}
                </Button>
              </div>
              {students.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  {messages.noStudentsForComment}
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {students.map((student) => {
                    const existing = existingByStudentId.get(student.id);
                    const checked = selectedStudentIds.has(student.id);
                    return (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="studentProfileIds"
                          value={student.id}
                          checked={checked}
                          onChange={(event) =>
                            toggleStudent(student.id, event.target.checked)
                          }
                          disabled={pending}
                          className="mt-1 size-4"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-primary">
                            {student.fullName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            No: {student.studentNumber}
                          </span>
                          {existing ? (
                            <span className="mt-1 inline-flex rounded-full bg-info px-2 py-0.5 text-xs text-info-foreground">
                              {messages.existingCommentBadge}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {state.fieldErrors?.studentProfileIds ? (
                <p className="text-sm text-danger-foreground">
                  {state.fieldErrors.studentProfileIds}
                </p>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <h3 className="font-medium text-primary">
                {messages.commentCategoryColumn}
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label
                    key={category.value}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card p-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value={category.value}
                        defaultChecked={category.value === "INFORMATION"}
                        disabled={pending}
                      />
                      <span>{category.label}</span>
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {category.point > 0 ? `+${category.point}` : category.point}
                    </span>
                  </label>
                ))}
              </div>
              {state.fieldErrors?.category ? (
                <p className="text-sm text-danger-foreground">
                  {state.fieldErrors.category}
                </p>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-border p-3">
              <h3 className="font-medium text-primary">
                {messages.commentNoteColumn}
              </h3>
              <div className="space-y-2">
                <Label htmlFor={`student-comments-${timetableParticipantId}-${academicCalendarDayId}`}>
                  {messages.commentNoteLabel}
                </Label>
                <Textarea
                  id={`student-comments-${timetableParticipantId}-${academicCalendarDayId}`}
                  name="content"
                  maxLength={5000}
                  required
                  placeholder={messages.commentPlaceholder}
                  aria-invalid={Boolean(state.fieldErrors?.content)}
                  className="min-h-72"
                />
                {state.fieldErrors?.content ? (
                  <p className="text-sm text-danger-foreground">
                    {state.fieldErrors.content}
                  </p>
                ) : null}
              </div>
            </section>
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
            <Button
              type="submit"
              disabled={pending || students.length === 0}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {messages.saveStudentComments}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
