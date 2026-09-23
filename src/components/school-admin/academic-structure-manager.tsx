"use client";

import {
  useActionState,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  Clock3,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  School,
} from "lucide-react";
import {
  changeAcademicStructureStatus,
  saveClassSection,
  saveCourseOffering,
  saveEducationStage,
  saveGradeLevel,
  saveLessonPeriod,
  saveSubject,
} from "@/app/(school-admin)/academics/structure/actions";
import { DataTableShell, TableEmptyState } from "@/components/admin/data-table-shell";
import { PageHeader } from "@/components/admin/page-header";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMessage } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import type {
  AcademicStructureEntity,
  AcademicStructureField,
  AcademicStructureState,
} from "@/lib/academic-structure-validation";
import type { AcademicYearRecord } from "@/server/academics/academic-calendar";
import type {
  AcademicStructureRecord,
  ClassSectionRecord,
  EducationStageRecord,
  GradeLevelRecord,
  LessonPeriodRecord,
  SubjectRecord,
} from "@/server/academics/academic-structure";

const initialState: AcademicStructureState = {};
type Action = (
  state: AcademicStructureState,
  form: FormData,
) => Promise<AcademicStructureState>;

type Messages = Pick<
  AppDictionary,
  "common" | "academicStructure"
>;

function ActionAlert({ state }: { state: AcademicStructureState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert
      role={state.status === "error" ? "alert" : "status"}
      variant={state.status === "error" ? "danger" : "success"}
    >
      <AlertDescription className="mt-0">{state.message}</AlertDescription>
    </Alert>
  );
}

function FieldError({
  state,
  field,
  id,
}: {
  state: AcademicStructureState;
  field: AcademicStructureField;
  id: string;
}) {
  const message = state.fieldErrors?.[field];
  return message ? (
    <p id={id} className="mt-2 text-xs text-danger-foreground">
      {message}
    </p>
  ) : null;
}

function RecordDialogContent({
  title,
  description,
  action,
  submitLabel,
  messages,
  children,
  onClose,
}: {
  title: string;
  description: string;
  action: Action;
  submitLabel: string;
  messages: Messages;
  children: (state: AcademicStructureState, pending: boolean) => ReactNode;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-5">
        {children(state, pending)}
        <ActionAlert state={state} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
          >
            {state.status === "success"
              ? messages.common.close
              : messages.common.cancel}
          </Button>
          {state.status !== "success" && (
            <Button type="submit" disabled={pending}>
              {pending ? messages.common.saving : submitLabel}
            </Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function RecordDialog({
  trigger,
  ...contentProps
}: Omit<Parameters<typeof RecordDialogContent>[0], "onClose"> & {
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && (
        <RecordDialogContent
          {...contentProps}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function LocalizedFields({
  prefix,
  values,
  labels,
  placeholders,
  state,
  pending,
}: {
  prefix: string;
  values?: { tr: string; sq: string; en: string };
  labels: { tr: string; sq: string; en: string };
  placeholders?: { tr: string; sq: string; en: string };
  state: AcademicStructureState;
  pending: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {(["tr", "sq", "en"] as const).map((locale) => {
        const suffix = locale[0].toUpperCase() + locale.slice(1);
        const field = `name${suffix}` as "nameTr" | "nameSq" | "nameEn";
        const errorId = `${prefix}-${locale}-error`;
        return (
          <div key={locale}>
            <Label htmlFor={`${prefix}-${locale}`}>{labels[locale]}</Label>
            <Input
              id={`${prefix}-${locale}`}
              name={field}
              defaultValue={values?.[locale]}
              placeholder={placeholders?.[locale]}
              minLength={1}
              maxLength={150}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldErrors?.[field])}
              aria-describedby={state.fieldErrors?.[field] ? errorId : undefined}
              className="mt-2"
            />
            <FieldError state={state} field={field} id={errorId} />
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ archived, messages }: { archived: boolean; messages: Messages }) {
  return (
    <Badge variant={archived ? "outline" : "success"}>
      {archived
        ? messages.academicStructure.archived
        : messages.academicStructure.active}
    </Badge>
  );
}

function LifecycleContent({
  entity,
  id,
  revision,
  name,
  archived,
  messages,
}: {
  entity: AcademicStructureEntity;
  id: string;
  revision: string;
  name: string;
  archived: boolean;
  messages: Messages;
}) {
  const [state, action, pending] = useActionState(
    changeAcademicStructureStatus,
    initialState,
  );
  const structure = messages.academicStructure;
  return (
    <AlertDialogContent>
        <form action={action} className="contents">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="transition" value={archived ? "restore" : "archive"} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
          <AlertDialogHeader>
            <AlertDialogTitle>
              {formatMessage(
                archived ? structure.restoreTitle : structure.archiveTitle,
                { name },
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
                ? structure.restoreDescription
                : structure.archiveDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ActionAlert state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {state.status === "success"
                ? messages.common.close
                : messages.common.cancel}
            </AlertDialogCancel>
            {state.status !== "success" && (
              <Button
                type="submit"
                variant={archived ? "default" : "danger"}
                disabled={pending}
              >
                {pending
                  ? messages.common.processing
                  : archived
                    ? messages.common.restore
                    : messages.common.archive}
              </Button>
            )}
          </AlertDialogFooter>
        </form>
    </AlertDialogContent>
  );
}

function LifecycleButton({
  entity,
  id,
  revision,
  name,
  archived,
  messages,
}: {
  entity: AcademicStructureEntity;
  id: string;
  revision: string;
  name: string;
  archived: boolean;
  messages: Messages;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={archived ? "outline" : "ghost"} size="sm">
          {archived ? <RotateCcw aria-hidden /> : <Archive aria-hidden />}
          {archived ? messages.common.restore : messages.common.archive}
        </Button>
      </AlertDialogTrigger>
      {open && (
        <LifecycleContent
          entity={entity}
          id={id}
          revision={revision}
          name={name}
          archived={archived}
          messages={messages}
        />
      )}
    </AlertDialog>
  );
}

function YearSelector({
  years,
  selectedYearId,
  messages,
}: {
  years: AcademicYearRecord[];
  selectedYearId: string;
  messages: Messages;
}) {
  const router = useRouter();
  return (
    <div className="rounded-xl border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div>
        <Label htmlFor="academic-structure-year">
          {messages.academicStructure.yearLabel}
        </Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {messages.academicStructure.yearHelp}
        </p>
      </div>
      <NativeSelect
        id="academic-structure-year"
        value={selectedYearId}
        onChange={(event) =>
          router.push(`/academics/structure?year=${encodeURIComponent(event.target.value)}`)
        }
        className="mt-3 sm:mt-0 sm:w-56"
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function StageDialog({
  yearId,
  stage,
  nextSequence,
  messages,
  trigger,
}: {
  yearId: string;
  stage?: EducationStageRecord;
  nextSequence: number;
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={stage ? structure.editStage : structure.newStage}
      description={structure.stagesDescription}
      action={saveEducationStage}
      submitLabel={stage ? messages.common.save : structure.create}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="id" value={stage?.id ?? "new"} />
          <input type="hidden" name="revision" value={stage?.revision ?? "new"} />
          <input type="hidden" name="academicYearId" value={yearId} />
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor={`stage-code-${stage?.id ?? "new"}`}>
                {structure.stageCode}
              </Label>
              <Input
                id={`stage-code-${stage?.id ?? "new"}`}
                name="code"
                defaultValue={stage?.code}
                placeholder="PRIMARY"
                maxLength={30}
                required
                disabled={pending}
                className="mt-2"
              />
              <FieldError state={state} field="code" id="stage-code-error" />
            </div>
            <div>
              <Label htmlFor={`stage-sequence-${stage?.id ?? "new"}`}>
                {messages.common.sequence}
              </Label>
              <Input
                id={`stage-sequence-${stage?.id ?? "new"}`}
                name="sequence"
                type="number"
                min={1}
                max={100}
                defaultValue={stage?.sequence ?? nextSequence}
                required
                disabled={pending}
                className="mt-2"
              />
              <FieldError state={state} field="sequence" id="stage-sequence-error" />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs text-muted-foreground">{structure.translationsHelp}</p>
            <LocalizedFields
              prefix={`stage-name-${stage?.id ?? "new"}`}
              values={stage?.names}
              labels={{
                tr: structure.stageNameTr,
                sq: structure.stageNameSq,
                en: structure.stageNameEn,
              }}
              placeholders={{
                tr: structure.stagePlaceholderTr,
                sq: structure.stagePlaceholderSq,
                en: structure.stagePlaceholderEn,
              }}
              state={state}
              pending={pending}
            />
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function LevelDialog({
  yearId,
  level,
  stages,
  nextSequence,
  messages,
  trigger,
}: {
  yearId: string;
  level?: GradeLevelRecord;
  stages: EducationStageRecord[];
  nextSequence: number;
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={level ? structure.editLevel : structure.newLevel}
      description={structure.levelsDescription}
      action={saveGradeLevel}
      submitLabel={level ? messages.common.save : structure.create}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="id" value={level?.id ?? "new"} />
          <input type="hidden" name="revision" value={level?.revision ?? "new"} />
          <input type="hidden" name="academicYearId" value={yearId} />
          <div>
            <Label htmlFor={`level-stage-${level?.id ?? "new"}`}>{structure.stage}</Label>
            <NativeSelect
              id={`level-stage-${level?.id ?? "new"}`}
              name="educationStageId"
              defaultValue={level?.educationStageId ?? ""}
              required
              disabled={pending}
              className="mt-2"
            >
              <option value="" disabled>{structure.selectStage}</option>
              {stages.filter((stage) => !stage.archived).map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="educationStageId" id="level-stage-error" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor={`level-code-${level?.id ?? "new"}`}>{structure.levelCode}</Label>
              <Input
                id={`level-code-${level?.id ?? "new"}`}
                name="code"
                defaultValue={level?.code}
                placeholder="PRF / 1 / 2"
                maxLength={30}
                required
                disabled={pending}
                className="mt-2"
              />
              <FieldError state={state} field="code" id="level-code-error" />
            </div>
            <div>
              <Label htmlFor={`level-sequence-${level?.id ?? "new"}`}>{messages.common.sequence}</Label>
              <Input
                id={`level-sequence-${level?.id ?? "new"}`}
                name="sequence"
                type="number"
                min={1}
                max={200}
                defaultValue={level?.sequence ?? nextSequence}
                required
                disabled={pending}
                className="mt-2"
              />
              <FieldError state={state} field="sequence" id="level-sequence-error" />
            </div>
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function SectionDialog({
  yearId,
  section,
  levels,
  messages,
  trigger,
}: {
  yearId: string;
  section?: ClassSectionRecord;
  levels: GradeLevelRecord[];
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={section ? structure.editSection : structure.newSection}
      description={structure.sectionsDescription}
      action={saveClassSection}
      submitLabel={section ? messages.common.save : structure.create}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="id" value={section?.id ?? "new"} />
          <input type="hidden" name="revision" value={section?.revision ?? "new"} />
          <input type="hidden" name="academicYearId" value={yearId} />
          <div>
            <Label htmlFor={`section-level-${section?.id ?? "new"}`}>{structure.level}</Label>
            <NativeSelect
              id={`section-level-${section?.id ?? "new"}`}
              name="gradeLevelId"
              defaultValue={section?.gradeLevelId ?? ""}
              required
              disabled={pending}
              className="mt-2"
            >
              <option value="" disabled>{structure.selectLevel}</option>
              {levels.filter((level) => !level.archived).map((level) => (
                <option key={level.id} value={level.id}>{level.code} · {level.stageName}</option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="gradeLevelId" id="section-level-error" />
          </div>
          <div>
            <Label htmlFor={`section-code-${section?.id ?? "new"}`}>{structure.sectionCode}</Label>
            <Input
              id={`section-code-${section?.id ?? "new"}`}
              name="code"
              defaultValue={section?.code}
              placeholder="1 / 2 / A"
              maxLength={30}
              required
              disabled={pending}
              className="mt-2"
            />
            <FieldError state={state} field="code" id="section-code-error" />
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function SubjectDialog({
  subject,
  messages,
  trigger,
}: {
  subject?: SubjectRecord;
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={subject ? structure.editSubject : structure.newSubject}
      description={structure.subjectsDescription}
      action={saveSubject}
      submitLabel={subject ? messages.common.save : structure.create}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="id" value={subject?.id ?? "new"} />
          <input type="hidden" name="revision" value={subject?.revision ?? "new"} />
          <p className="text-xs text-muted-foreground">{structure.translationsHelp}</p>
          <LocalizedFields
            prefix={`subject-name-${subject?.id ?? "new"}`}
            values={subject?.names}
            labels={{
              tr: structure.subjectNameTr,
              sq: structure.subjectNameSq,
              en: structure.subjectNameEn,
            }}
            state={state}
            pending={pending}
          />
          <div>
            <Label htmlFor="subject-track">{structure.subjectTrack}</Label>
            <NativeSelect
              id="subject-track"
              name="track"
              defaultValue={subject?.track ?? "GENERAL"}
              disabled={pending}
              className="mt-2"
            >
              <option value="GENERAL">{structure.subjectTrackGeneral}</option>
              <option value="ELECTIVE">{structure.subjectTrackElective}</option>
              <option value="IGCSE">{structure.subjectTrackIgcse}</option>
            </NativeSelect>
            <FieldError state={state} field="track" id="subject-track-error" />
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function OfferingDialog({
  yearId,
  sections,
  subjects,
  messages,
  trigger,
}: {
  yearId: string;
  sections: ClassSectionRecord[];
  subjects: SubjectRecord[];
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={structure.newOffering}
      description={structure.offeringsDescription}
      action={saveCourseOffering}
      submitLabel={structure.add}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="academicYearId" value={yearId} />
          <div>
            <Label htmlFor="offering-section">{structure.classSection}</Label>
            <NativeSelect id="offering-section" name="classSectionId" required disabled={pending} defaultValue="" className="mt-2">
              <option value="" disabled>{structure.selectSection}</option>
              {sections.filter((section) => !section.archived).map((section) => (
                <option key={section.id} value={section.id}>{section.displayName} · {section.stageName}</option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="classSectionId" id="offering-section-error" />
          </div>
          <div>
            <Label htmlFor="offering-subject">{structure.subject}</Label>
            <NativeSelect id="offering-subject" name="subjectId" required disabled={pending} defaultValue="" className="mt-2">
              <option value="" disabled>{structure.selectSubject}</option>
              {subjects.filter((subject) => !subject.archived).map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </NativeSelect>
            <FieldError state={state} field="subjectId" id="offering-subject-error" />
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function PeriodDialog({
  yearId,
  period,
  nextSequence,
  messages,
  trigger,
}: {
  yearId: string;
  period?: LessonPeriodRecord;
  nextSequence: number;
  messages: Messages;
  trigger: ReactNode;
}) {
  const structure = messages.academicStructure;
  return (
    <RecordDialog
      trigger={trigger}
      title={period ? structure.editPeriod : structure.newPeriod}
      description={structure.periodsDescription}
      action={saveLessonPeriod}
      submitLabel={period ? messages.common.save : structure.create}
      messages={messages}
    >
      {(state, pending) => (
        <>
          <input type="hidden" name="id" value={period?.id ?? "new"} />
          <input type="hidden" name="revision" value={period?.revision ?? "new"} />
          <input type="hidden" name="academicYearId" value={yearId} />
          <p className="text-xs text-muted-foreground">{structure.translationsHelp}</p>
          <LocalizedFields
            prefix={`period-name-${period?.id ?? "new"}`}
            values={period?.names}
            labels={{
              tr: structure.periodNameTr,
              sq: structure.periodNameSq,
              en: structure.periodNameEn,
            }}
            state={state}
            pending={pending}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor={`period-sequence-${period?.id ?? "new"}`}>{messages.common.sequence}</Label>
              <Input id={`period-sequence-${period?.id ?? "new"}`} name="sequence" type="number" min={1} max={100} defaultValue={period?.sequence ?? nextSequence} required disabled={pending} className="mt-2" />
              <FieldError state={state} field="sequence" id="period-sequence-error" />
            </div>
            <div>
              <Label htmlFor={`period-start-${period?.id ?? "new"}`}>{structure.startTime}</Label>
              <Input id={`period-start-${period?.id ?? "new"}`} name="startTime" type="time" defaultValue={period?.startTime} required disabled={pending} className="mt-2" />
              <FieldError state={state} field="startTime" id="period-start-error" />
            </div>
            <div>
              <Label htmlFor={`period-end-${period?.id ?? "new"}`}>{structure.endTime}</Label>
              <Input id={`period-end-${period?.id ?? "new"}`} name="endTime" type="time" defaultValue={period?.endTime} required disabled={pending} className="mt-2" />
              <FieldError state={state} field="endTime" id="period-end-error" />
            </div>
          </div>
        </>
      )}
    </RecordDialog>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return <TableEmptyState title={title} description={description} />;
}

export function AcademicStructureManager({
  schoolName,
  years,
  selectedYearId,
  structure,
  canManage,
  messages,
}: {
  schoolName: string;
  years: AcademicYearRecord[];
  selectedYearId: string;
  structure: AcademicStructureRecord;
  canManage: boolean;
  messages: Messages;
}) {
  const text = messages.academicStructure;
  const activeStages = structure.stages.filter((item) => !item.archived);
  const activeLevels = structure.gradeLevels.filter((item) => !item.archived);
  const activeSections = structure.classSections.filter((item) => !item.archived);
  const activeSubjects = structure.subjects.filter((item) => !item.archived);
  const nextStage = Math.max(0, ...activeStages.map((item) => item.sequence)) + 1;
  const nextLevel = Math.max(0, ...activeLevels.map((item) => item.sequence)) + 1;
  const nextPeriod = Math.max(0, ...structure.lessonPeriods.filter((item) => !item.archived).map((item) => item.sequence)) + 1;
  const editButton = (label: string) => (
    <Button variant="outline" size="sm"><Pencil aria-hidden />{label}</Button>
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={formatMessage(text.description, { name: schoolName })}
      />
      <YearSelector years={years} selectedYearId={selectedYearId} messages={messages} />
      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels"><Layers3 className="mr-2 size-4" aria-hidden />{text.levelsTab}</TabsTrigger>
          <TabsTrigger value="sections"><School className="mr-2 size-4" aria-hidden />{text.sectionsTab}</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="mr-2 size-4" aria-hidden />{text.subjectsTab}</TabsTrigger>
          <TabsTrigger value="offerings">{text.offeringsTab}</TabsTrigger>
          <TabsTrigger value="periods"><Clock3 className="mr-2 size-4" aria-hidden />{text.periodsTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-6">
          <DataTableShell
            title={text.stagesTitle}
            description={text.stagesDescription}
            toolbar={canManage ? (
              <StageDialog yearId={selectedYearId} nextSequence={nextStage} messages={messages} trigger={<Button><Plus aria-hidden />{text.newStage}</Button>} />
            ) : undefined}
            footer={formatMessage(text.recordsFooter, { count: structure.stages.length })}
          >
            {structure.stages.length === 0 ? <Empty title={text.noStages} description={text.noStagesDescription} /> : (
              <Table>
                <TableHeader><TableRow><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.stageCode}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader>
                <TableBody>{structure.stages.map((stage) => (
                  <TableRow key={stage.id} className={stage.archived ? "opacity-65" : undefined}>
                    <TableCell>{stage.sequence}</TableCell><TableCell className="font-mono text-xs">{stage.code}</TableCell><TableCell className="font-medium">{stage.name}</TableCell><TableCell><StatusBadge archived={stage.archived} messages={messages} /></TableCell>
                    <TableCell><div className="flex justify-end gap-2">{canManage && !stage.archived && <StageDialog yearId={selectedYearId} stage={stage} nextSequence={nextStage} messages={messages} trigger={editButton(messages.common.edit)} />}{canManage && <LifecycleButton entity="stage" id={stage.id} revision={stage.revision} name={stage.name} archived={stage.archived} messages={messages} />}</div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </DataTableShell>

          <DataTableShell
            title={text.levelsTitle}
            description={text.levelsDescription}
            toolbar={canManage && activeStages.length ? (
              <LevelDialog yearId={selectedYearId} stages={structure.stages} nextSequence={nextLevel} messages={messages} trigger={<Button><Plus aria-hidden />{text.newLevel}</Button>} />
            ) : undefined}
            footer={formatMessage(text.recordsFooter, { count: structure.gradeLevels.length })}
          >
            {structure.gradeLevels.length === 0 ? <Empty title={text.noLevels} description={text.noLevelsDescription} /> : (
              <Table><TableHeader><TableRow><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.levelCode}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader>
                <TableBody>{structure.gradeLevels.map((level) => (
                  <TableRow key={level.id} className={level.archived ? "opacity-65" : undefined}><TableCell>{level.sequence}</TableCell><TableCell className="font-medium">{level.code}</TableCell><TableCell>{level.stageName}</TableCell><TableCell><StatusBadge archived={level.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !level.archived && <LevelDialog yearId={selectedYearId} level={level} stages={structure.stages} nextSequence={nextLevel} messages={messages} trigger={editButton(messages.common.edit)} />}{canManage && <LifecycleButton entity="grade" id={level.id} revision={level.revision} name={level.code} archived={level.archived} messages={messages} />}</div></TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="sections">
          <DataTableShell title={text.sectionsTitle} description={text.sectionsDescription} toolbar={canManage && activeLevels.length ? <SectionDialog yearId={selectedYearId} levels={structure.gradeLevels} messages={messages} trigger={<Button><Plus aria-hidden />{text.newSection}</Button>} /> : undefined} footer={formatMessage(text.recordsFooter, { count: structure.classSections.length })}>
            {structure.classSections.length === 0 ? <Empty title={text.noSections} description={text.noSectionsDescription} /> : (
              <Table><TableHeader><TableRow><TableHead>{text.classSection}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.classSections.map((section) => (
                <TableRow key={section.id} className={section.archived ? "opacity-65" : undefined}><TableCell className="font-medium">{section.displayName}</TableCell><TableCell>{section.stageName}</TableCell><TableCell><StatusBadge archived={section.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !section.archived && <SectionDialog yearId={selectedYearId} section={section} levels={structure.gradeLevels} messages={messages} trigger={editButton(messages.common.edit)} />}{canManage && <LifecycleButton entity="section" id={section.id} revision={section.revision} name={section.displayName} archived={section.archived} messages={messages} />}</div></TableCell></TableRow>
              ))}</TableBody></Table>
            )}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="subjects">
          <DataTableShell title={text.subjectsTitle} description={text.subjectsDescription} toolbar={canManage ? <SubjectDialog messages={messages} trigger={<Button><Plus aria-hidden />{text.newSubject}</Button>} /> : undefined} footer={formatMessage(text.recordsFooter, { count: structure.subjects.length })}>
            {structure.subjects.length === 0 ? <Empty title={text.noSubjects} description={text.noSubjectsDescription} /> : (
              <Table><TableHeader><TableRow><TableHead>{text.subjectNameTr}</TableHead><TableHead>{text.subjectNameSq}</TableHead><TableHead>{text.subjectNameEn}</TableHead><TableHead>{text.subjectTrack}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.subjects.map((subject) => (
                <TableRow key={subject.id} className={subject.archived ? "opacity-65" : undefined}><TableCell>{subject.names.tr}</TableCell><TableCell>{subject.names.sq}</TableCell><TableCell>{subject.names.en}</TableCell><TableCell>{subject.track === "ELECTIVE" ? text.subjectTrackElective : subject.track === "IGCSE" ? text.subjectTrackIgcse : text.subjectTrackGeneral}</TableCell><TableCell><StatusBadge archived={subject.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !subject.archived && <SubjectDialog subject={subject} messages={messages} trigger={editButton(messages.common.edit)} />}{canManage && <LifecycleButton entity="subject" id={subject.id} revision={subject.revision} name={subject.name} archived={subject.archived} messages={messages} />}</div></TableCell></TableRow>
              ))}</TableBody></Table>
            )}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="offerings">
          <DataTableShell title={text.offeringsTitle} description={text.offeringsDescription} toolbar={canManage && activeSections.length && activeSubjects.length ? <OfferingDialog yearId={selectedYearId} sections={structure.classSections} subjects={structure.subjects} messages={messages} trigger={<Button><Plus aria-hidden />{text.newOffering}</Button>} /> : undefined} footer={formatMessage(text.recordsFooter, { count: structure.courseOfferings.length })}>
            {structure.courseOfferings.length === 0 ? <Empty title={text.noOfferings} description={text.noOfferingsDescription} /> : (
              <Table><TableHeader><TableRow><TableHead>{text.classSection}</TableHead><TableHead>{text.subject}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.courseOfferings.map((offering) => (
                <TableRow key={offering.id} className={offering.archived ? "opacity-65" : undefined}><TableCell className="font-medium">{offering.className}</TableCell><TableCell>{offering.subjectName}</TableCell><TableCell><StatusBadge archived={offering.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end">{canManage && <LifecycleButton entity="offering" id={offering.id} revision={offering.revision} name={`${offering.className} · ${offering.subjectName}`} archived={offering.archived} messages={messages} />}</div></TableCell></TableRow>
              ))}</TableBody></Table>
            )}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="periods">
          <DataTableShell title={text.periodsTitle} description={text.periodsDescription} toolbar={canManage ? <PeriodDialog yearId={selectedYearId} nextSequence={nextPeriod} messages={messages} trigger={<Button><Plus aria-hidden />{text.newPeriod}</Button>} /> : undefined} footer={formatMessage(text.recordsFooter, { count: structure.lessonPeriods.length })}>
            {structure.lessonPeriods.length === 0 ? <Empty title={text.noPeriods} description={text.noPeriodsDescription} /> : (
              <Table><TableHeader><TableRow><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.period}</TableHead><TableHead>{text.startTime}</TableHead><TableHead>{text.endTime}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.lessonPeriods.map((period) => (
                <TableRow key={period.id} className={period.archived ? "opacity-65" : undefined}><TableCell>{period.sequence}</TableCell><TableCell className="font-medium">{period.name}</TableCell><TableCell className="font-mono text-xs">{period.startTime}</TableCell><TableCell className="font-mono text-xs">{period.endTime}</TableCell><TableCell><StatusBadge archived={period.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !period.archived && <PeriodDialog yearId={selectedYearId} period={period} nextSequence={nextPeriod} messages={messages} trigger={editButton(messages.common.edit)} />}{canManage && <LifecycleButton entity="period" id={period.id} revision={period.revision} name={period.name} archived={period.archived} messages={messages} />}</div></TableCell></TableRow>
              ))}</TableBody></Table>
            )}
          </DataTableShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
