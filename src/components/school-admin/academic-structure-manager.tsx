"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, BookOpen, Clock3, Layers3, Pencil, Plus, RotateCcw, School } from "lucide-react";
import {
  changeAcademicStructureStatus,
  saveClassSection,
  saveCourseOffering,
  saveEducationStage,
  saveGradeLevel,
  saveLessonPeriod,
  saveScheduleProfile,
  saveSubject,
  setupAcademicYear,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppDictionary } from "@/i18n/dictionaries/types";
import { formatMessage } from "@/i18n/format";
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
  ScheduleProfileRecord,
  SubjectRecord,
} from "@/server/academics/academic-structure";

const initialState: AcademicStructureState = {};
type Action = (state: AcademicStructureState, form: FormData) => Promise<AcademicStructureState>;
type Messages = Pick<AppDictionary, "common" | "academicStructure">;

function ActionAlert({ state }: { state: AcademicStructureState }) {
  if (!state.status || !state.message) return null;
  return (
    <Alert role={state.status === "error" ? "alert" : "status"} variant={state.status === "error" ? "danger" : "success"}>
      <AlertDescription className="mt-0">{state.message}</AlertDescription>
    </Alert>
  );
}

function FieldError({ state, field, id }: { state: AcademicStructureState; field: AcademicStructureField; id: string }) {
  const message = state.fieldErrors?.[field];
  return message ? <p id={id} className="mt-2 text-xs text-danger-foreground">{message}</p> : null;
}

function RecordDialog({
  trigger,
  title,
  description,
  action,
  submitLabel,
  messages,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  action: Action;
  submitLabel: string;
  messages: Messages;
  children: (state: AcademicStructureState, pending: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && (
        <RecordDialogContent
          title={title}
          description={description}
          action={action}
          submitLabel={submitLabel}
          messages={messages}
          onClose={() => setOpen(false)}
        >
          {children}
        </RecordDialogContent>
      )}
    </Dialog>
  );
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
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <form action={formAction} className="space-y-5">
        {children(state, pending)}
        <ActionAlert state={state} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {state.status === "success" ? messages.common.close : messages.common.cancel}
          </Button>
          {state.status !== "success" && <Button type="submit" disabled={pending}>{pending ? messages.common.saving : submitLabel}</Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LocalizedFields({
  prefix,
  values,
  labels,
  state,
  pending,
}: {
  prefix: string;
  values?: { tr: string; sq: string; en: string };
  labels: { tr: string; sq: string; en: string };
  state: AcademicStructureState;
  pending: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {(["tr", "sq", "en"] as const).map((locale) => {
        const suffix = locale[0].toUpperCase() + locale.slice(1);
        const field = `name${suffix}` as "nameTr" | "nameSq" | "nameEn";
        return (
          <div key={locale}>
            <Label htmlFor={`${prefix}-${locale}`}>{labels[locale]}</Label>
            <Input id={`${prefix}-${locale}`} name={field} defaultValue={values?.[locale]} minLength={1} maxLength={150} required disabled={pending} className="mt-2" />
            <FieldError state={state} field={field} id={`${prefix}-${locale}-error`} />
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ archived, messages }: { archived: boolean; messages: Messages }) {
  return <Badge variant={archived ? "outline" : "success"}>{archived ? messages.academicStructure.archived : messages.academicStructure.active}</Badge>;
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
      {open && <LifecycleContent entity={entity} id={id} revision={revision} name={name} archived={archived} messages={messages} />}
    </AlertDialog>
  );
}

function LifecycleContent(props: {
  entity: AcademicStructureEntity;
  id: string;
  revision: string;
  name: string;
  archived: boolean;
  messages: Messages;
}) {
  const [state, action, pending] = useActionState(changeAcademicStructureStatus, initialState);
  const text = props.messages.academicStructure;
  return (
    <AlertDialogContent>
      <form action={action} className="contents">
        <input type="hidden" name="entity" value={props.entity} />
        <input type="hidden" name="transition" value={props.archived ? "restore" : "archive"} />
        <input type="hidden" name="id" value={props.id} />
        <input type="hidden" name="revision" value={props.revision} />
        <AlertDialogHeader>
          <AlertDialogTitle>{formatMessage(props.archived ? text.restoreTitle : text.archiveTitle, { name: props.name })}</AlertDialogTitle>
          <AlertDialogDescription>{props.archived ? text.restoreDescription : text.archiveDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <ActionAlert state={state} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{state.status === "success" ? props.messages.common.close : props.messages.common.cancel}</AlertDialogCancel>
          {state.status !== "success" && <Button type="submit" variant={props.archived ? "default" : "danger"} disabled={pending}>{pending ? props.messages.common.processing : props.archived ? props.messages.common.restore : props.messages.common.archive}</Button>}
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}

function StageDialog({ stage, nextSequence, messages, trigger }: { stage?: EducationStageRecord; nextSequence: number; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={stage ? text.editStage : text.newStage} description={text.stagesDescription} action={saveEducationStage} submitLabel={stage ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={stage?.id ?? "new"} /><input type="hidden" name="revision" value={stage?.revision ?? "new"} />
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div><Label htmlFor="stage-code">{text.stageCode}</Label><Input id="stage-code" name="code" defaultValue={stage?.code} maxLength={30} required disabled={pending} className="mt-2" /><FieldError state={state} field="code" id="stage-code-error" /></div>
          <div><Label htmlFor="stage-sequence">{messages.common.sequence}</Label><Input id="stage-sequence" name="sequence" type="number" min={1} max={100} defaultValue={stage?.sequence ?? nextSequence} required disabled={pending} className="mt-2" /><FieldError state={state} field="sequence" id="stage-sequence-error" /></div>
        </div>
        <LocalizedFields prefix="stage-name" values={stage?.names} labels={{ tr: text.stageNameTr, sq: text.stageNameSq, en: text.stageNameEn }} state={state} pending={pending} />
      </>}
    </RecordDialog>
  );
}

function LevelDialog({ level, stages, nextSequence, messages, trigger }: { level?: GradeLevelRecord; stages: EducationStageRecord[]; nextSequence: number; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={level ? text.editLevel : text.newLevel} description={text.levelsDescription} action={saveGradeLevel} submitLabel={level ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={level?.id ?? "new"} /><input type="hidden" name="revision" value={level?.revision ?? "new"} />
        <div><Label htmlFor="level-stage">{text.stage}</Label><NativeSelect id="level-stage" name="educationStageId" defaultValue={level?.educationStageId ?? ""} required disabled={pending} className="mt-2"><option value="" disabled>{text.selectStage}</option>{stages.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect><FieldError state={state} field="educationStageId" id="level-stage-error" /></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_120px]">
          <div><Label htmlFor="level-code">{text.levelCode}</Label><Input id="level-code" name="code" defaultValue={level?.code} maxLength={30} required disabled={pending} className="mt-2" /></div>
          <div><Label htmlFor="level-label">{text.displayLabel}</Label><Input id="level-label" name="displayLabel" defaultValue={level?.displayLabel ?? level?.code} maxLength={100} required disabled={pending} className="mt-2" /></div>
          <div><Label htmlFor="level-sequence">{messages.common.sequence}</Label><Input id="level-sequence" name="sequence" type="number" min={1} max={200} defaultValue={level?.sequence ?? nextSequence} required disabled={pending} className="mt-2" /></div>
        </div>
      </>}
    </RecordDialog>
  );
}

function SectionDialog({ section, levels, nextSequence, messages, trigger }: { section?: ClassSectionRecord; levels: GradeLevelRecord[]; nextSequence: number; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={section ? text.editSection : text.newSection} description={text.sectionsDescription} action={saveClassSection} submitLabel={section ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={section?.id ?? "new"} /><input type="hidden" name="revision" value={section?.revision ?? "new"} />
        <div><Label htmlFor="section-level">{text.level}</Label><NativeSelect id="section-level" name="gradeLevelId" defaultValue={section?.gradeLevelId ?? ""} required disabled={pending} className="mt-2"><option value="" disabled>{text.selectLevel}</option>{levels.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.displayLabel} · {item.stageName}</option>)}</NativeSelect></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_120px]">
          <div><Label htmlFor="section-code">{text.sectionCode}</Label><Input id="section-code" name="code" defaultValue={section?.code} maxLength={30} required disabled={pending} className="mt-2" /></div>
          <div><Label htmlFor="section-label">{text.displayLabel}</Label><Input id="section-label" name="displayLabel" defaultValue={section?.displayLabel ?? ""} maxLength={100} disabled={pending} className="mt-2" /></div>
          <div><Label htmlFor="section-sequence">{messages.common.sequence}</Label><Input id="section-sequence" name="sequence" type="number" min={1} max={100} defaultValue={section?.sequence ?? nextSequence} required disabled={pending} className="mt-2" /></div>
        </div>
      </>}
    </RecordDialog>
  );
}

function SubjectDialog({ subject, messages, trigger }: { subject?: SubjectRecord; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={subject ? text.editSubject : text.newSubject} description={text.subjectsDescription} action={saveSubject} submitLabel={subject ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={subject?.id ?? "new"} /><input type="hidden" name="revision" value={subject?.revision ?? "new"} />
        <LocalizedFields prefix="subject-name" values={subject?.names} labels={{ tr: text.subjectNameTr, sq: text.subjectNameSq, en: text.subjectNameEn }} state={state} pending={pending} />
        <div><Label htmlFor="subject-track">{text.subjectTrack}</Label><NativeSelect id="subject-track" name="track" defaultValue={subject?.track ?? "GENERAL"} disabled={pending} className="mt-2"><option value="GENERAL">{text.subjectTrackGeneral}</option><option value="ELECTIVE">{text.subjectTrackElective}</option><option value="IGCSE">{text.subjectTrackIgcse}</option></NativeSelect></div>
      </>}
    </RecordDialog>
  );
}

function CurriculumDialog({ levels, subjects, messages, trigger }: { levels: GradeLevelRecord[]; subjects: SubjectRecord[]; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={text.newOffering} description={text.offeringsDescription} action={saveCourseOffering} submitLabel={text.add} messages={messages}>
      {(state, pending) => <>
        <div><Label htmlFor="curriculum-level">{text.level}</Label><NativeSelect id="curriculum-level" name="gradeLevelId" required disabled={pending} defaultValue="" className="mt-2"><option value="" disabled>{text.selectLevel}</option>{levels.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.displayLabel}</option>)}</NativeSelect></div>
        <div><Label htmlFor="curriculum-subject">{text.subject}</Label><NativeSelect id="curriculum-subject" name="subjectId" required disabled={pending} defaultValue="" className="mt-2"><option value="" disabled>{text.selectSubject}</option>{subjects.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></div>
        <div><Label htmlFor="curriculum-track">{text.subjectTrack}</Label><NativeSelect id="curriculum-track" name="track" defaultValue="GENERAL" disabled={pending} className="mt-2"><option value="GENERAL">{text.subjectTrackGeneral}</option><option value="ELECTIVE">{text.subjectTrackElective}</option><option value="IGCSE">{text.subjectTrackIgcse}</option></NativeSelect></div>
      </>}
    </RecordDialog>
  );
}

function ProfileDialog({ profile, messages, trigger }: { profile?: ScheduleProfileRecord; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={profile ? text.editProfile : text.newProfile} description={text.profilesDescription} action={saveScheduleProfile} submitLabel={profile ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={profile?.id ?? "new"} /><input type="hidden" name="revision" value={profile?.revision ?? "new"} />
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="profile-code">{text.profileCode}</Label><Input id="profile-code" name="code" defaultValue={profile?.code} maxLength={30} required disabled={pending} className="mt-2" /></div><div><Label htmlFor="profile-name">{text.profileName}</Label><Input id="profile-name" name="name" defaultValue={profile?.name} maxLength={100} required disabled={pending} className="mt-2" /></div></div>
        <div><Label htmlFor="profile-kind">{text.profileKind}</Label><NativeSelect id="profile-kind" name="profileKind" defaultValue={profile?.kind ?? "FULL_DAY"} disabled={pending} className="mt-2"><option value="FULL_DAY">{text.profileFullDay}</option><option value="MORNING">{text.profileMorning}</option><option value="AFTERNOON">{text.profileAfternoon}</option></NativeSelect></div>
      </>}
    </RecordDialog>
  );
}

function PeriodDialog({ period, profiles, nextSequence, messages, trigger }: { period?: LessonPeriodRecord; profiles: ScheduleProfileRecord[]; nextSequence: number; messages: Messages; trigger: ReactNode }) {
  const text = messages.academicStructure;
  return (
    <RecordDialog trigger={trigger} title={period ? text.editPeriod : text.newPeriod} description={text.periodsDescription} action={saveLessonPeriod} submitLabel={period ? messages.common.save : text.create} messages={messages}>
      {(state, pending) => <>
        <input type="hidden" name="id" value={period?.id ?? "new"} /><input type="hidden" name="revision" value={period?.revision ?? "new"} />
        <div><Label htmlFor="period-profile">{text.profile}</Label><NativeSelect id="period-profile" name="profileId" defaultValue={period?.profileId ?? ""} required disabled={pending || Boolean(period)} className="mt-2"><option value="" disabled>{text.selectProfile}</option>{profiles.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect>{period && <input type="hidden" name="profileId" value={period.profileId} />}</div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]"><div><Label htmlFor="period-code">{text.periodCode}</Label><Input id="period-code" name="code" defaultValue={period?.code} maxLength={30} required disabled={pending} className="mt-2" /></div><div><Label htmlFor="period-sequence">{messages.common.sequence}</Label><Input id="period-sequence" name="sequence" type="number" min={1} max={100} defaultValue={period?.sequence ?? nextSequence} required disabled={pending} className="mt-2" /></div></div>
        <LocalizedFields prefix="period-name" values={period?.names} labels={{ tr: text.periodNameTr, sq: text.periodNameSq, en: text.periodNameEn }} state={state} pending={pending} />
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="period-start">{text.startTime}</Label><Input id="period-start" name="startTime" type="time" defaultValue={period?.startTime} required disabled={pending} className="mt-2" /></div><div><Label htmlFor="period-end">{text.endTime}</Label><Input id="period-end" name="endTime" type="time" defaultValue={period?.endTime} required disabled={pending} className="mt-2" /></div></div>
      </>}
    </RecordDialog>
  );
}

function SetupPanel({ years, selectedYearId, structure, canManage, messages }: { years: AcademicYearRecord[]; selectedYearId: string | null; structure: AcademicStructureRecord; canManage: boolean; messages: Messages }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setupAcademicYear, initialState);
  const text = messages.academicStructure;
  if (!years.length) return <Alert><AlertDescription className="mt-0">{text.noYearDescription}</AlertDescription></Alert>;
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><h2 className="font-semibold">{text.setupTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{text.setupDescription}</p><p className="mt-2 text-xs text-muted-foreground">{formatMessage(text.setupCounts, { sections: structure.annualSetup.sectionCount, offerings: structure.annualSetup.offeringCount })}</p></div>
        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div><Label htmlFor="setup-year">{text.yearLabel}</Label><NativeSelect id="setup-year" name="academicYearId" value={selectedYearId ?? ""} onChange={(event) => router.push(`/academics/structure?year=${encodeURIComponent(event.target.value)}`)} className="mt-2 min-w-48">{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</NativeSelect></div>
          <div><Label htmlFor="setup-profile">{text.profileOptional}</Label><NativeSelect id="setup-profile" name="profileId" defaultValue="" className="mt-2 min-w-48"><option value="">{text.noDefaultProfile}</option>{structure.scheduleProfiles.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></div>
          {canManage && <Button type="submit" disabled={pending || !selectedYearId}>{pending ? messages.common.processing : text.setupButton}</Button>}
        </form>
      </div>
      <div className="mt-4"><ActionAlert state={state} /></div>
    </div>
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
  selectedYearId: string | null;
  structure: AcademicStructureRecord;
  canManage: boolean;
  messages: Messages;
}) {
  const text = messages.academicStructure;
  const activeStages = structure.stages.filter((item) => !item.archived);
  const activeLevels = structure.gradeLevels.filter((item) => !item.archived);
  const activeSubjects = structure.subjects.filter((item) => !item.archived);
  const activeProfiles = structure.scheduleProfiles.filter((item) => !item.archived);
  const nextStage = Math.max(0, ...activeStages.map((item) => item.sequence)) + 1;
  const nextLevel = Math.max(0, ...activeLevels.map((item) => item.sequence)) + 1;
  const nextSection = Math.max(0, ...structure.classSections.filter((item) => !item.archived).map((item) => item.sequence)) + 1;
  const nextPeriod = Math.max(0, ...structure.lessonPeriods.map((item) => item.sequence)) + 1;
  const editButton = <Button variant="outline" size="sm"><Pencil aria-hidden />{messages.common.edit}</Button>;
  const trackLabel = (track: "GENERAL" | "ELECTIVE" | "IGCSE") => track === "ELECTIVE" ? text.subjectTrackElective : track === "IGCSE" ? text.subjectTrackIgcse : text.subjectTrackGeneral;
  const footer = (count: number) => formatMessage(text.recordsFooter, { count });

  return (
    <div className="space-y-7">
      <PageHeader eyebrow={text.eyebrow} title={text.title} description={formatMessage(text.description, { name: schoolName })} />
      <Alert><AlertDescription className="mt-0">{text.masterDataNote}</AlertDescription></Alert>
      <SetupPanel years={years} selectedYearId={selectedYearId} structure={structure} canManage={canManage} messages={messages} />
      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels"><Layers3 className="mr-2 size-4" aria-hidden />{text.levelsTab}</TabsTrigger>
          <TabsTrigger value="sections"><School className="mr-2 size-4" aria-hidden />{text.sectionsTab}</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="mr-2 size-4" aria-hidden />{text.subjectsTab}</TabsTrigger>
          <TabsTrigger value="curriculum">{text.offeringsTab}</TabsTrigger>
          <TabsTrigger value="periods"><Clock3 className="mr-2 size-4" aria-hidden />{text.periodsTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-6">
          <DataTableShell title={text.stagesTitle} description={text.stagesDescription} toolbar={canManage ? <StageDialog nextSequence={nextStage} messages={messages} trigger={<Button><Plus aria-hidden />{text.newStage}</Button>} /> : undefined} footer={footer(structure.stages.length)}>
            {!structure.stages.length ? <Empty title={text.noStages} description={text.noStagesDescription} /> : <Table><TableHeader><TableRow><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.stageCode}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.stages.map((stage) => <TableRow key={stage.id} className={stage.archived ? "opacity-65" : undefined}><TableCell>{stage.sequence}</TableCell><TableCell className="font-mono text-xs">{stage.code}</TableCell><TableCell>{stage.name}</TableCell><TableCell><StatusBadge archived={stage.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !stage.archived && <StageDialog stage={stage} nextSequence={nextStage} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="stage" id={stage.id} revision={stage.revision} name={stage.name} archived={stage.archived} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
          <DataTableShell title={text.levelsTitle} description={text.levelsDescription} toolbar={canManage && activeStages.length ? <LevelDialog stages={structure.stages} nextSequence={nextLevel} messages={messages} trigger={<Button><Plus aria-hidden />{text.newLevel}</Button>} /> : undefined} footer={footer(structure.gradeLevels.length)}>
            {!structure.gradeLevels.length ? <Empty title={text.noLevels} description={text.noLevelsDescription} /> : <Table><TableHeader><TableRow><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.levelCode}</TableHead><TableHead>{text.displayLabel}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.gradeLevels.map((level) => <TableRow key={level.id} className={level.archived ? "opacity-65" : undefined}><TableCell>{level.sequence}</TableCell><TableCell>{level.code}</TableCell><TableCell>{level.displayLabel}</TableCell><TableCell>{level.stageName}</TableCell><TableCell><StatusBadge archived={level.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !level.archived && <LevelDialog level={level} stages={structure.stages} nextSequence={nextLevel} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="grade" id={level.id} revision={level.revision} name={level.displayLabel} archived={level.archived} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="sections">
          <DataTableShell title={text.sectionsTitle} description={text.sectionsDescription} toolbar={canManage && activeLevels.length ? <SectionDialog levels={structure.gradeLevels} nextSequence={nextSection} messages={messages} trigger={<Button><Plus aria-hidden />{text.newSection}</Button>} /> : undefined} footer={footer(structure.classSections.length)}>
            {!structure.classSections.length ? <Empty title={text.noSections} description={text.noSectionsDescription} /> : <Table><TableHeader><TableRow><TableHead>{text.classSection}</TableHead><TableHead>{text.stage}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.classSections.map((section) => <TableRow key={section.id} className={section.archived ? "opacity-65" : undefined}><TableCell>{section.displayName}</TableCell><TableCell>{section.stageName}</TableCell><TableCell><StatusBadge archived={section.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !section.archived && <SectionDialog section={section} levels={structure.gradeLevels} nextSequence={nextSection} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="section" id={section.id} revision={section.revision} name={section.displayName} archived={section.archived} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="subjects">
          <DataTableShell title={text.subjectsTitle} description={text.subjectsDescription} toolbar={canManage ? <SubjectDialog messages={messages} trigger={<Button><Plus aria-hidden />{text.newSubject}</Button>} /> : undefined} footer={footer(structure.subjects.length)}>
            {!structure.subjects.length ? <Empty title={text.noSubjects} description={text.noSubjectsDescription} /> : <Table><TableHeader><TableRow><TableHead>{text.subjectNameTr}</TableHead><TableHead>{text.subjectNameSq}</TableHead><TableHead>{text.subjectNameEn}</TableHead><TableHead>{text.subjectTrack}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.subjects.map((subject) => <TableRow key={subject.id} className={subject.archived ? "opacity-65" : undefined}><TableCell>{subject.names.tr}</TableCell><TableCell>{subject.names.sq}</TableCell><TableCell>{subject.names.en}</TableCell><TableCell>{trackLabel(subject.track)}</TableCell><TableCell><StatusBadge archived={subject.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !subject.archived && <SubjectDialog subject={subject} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="subject" id={subject.id} revision={subject.revision} name={subject.name} archived={subject.archived} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="curriculum">
          <DataTableShell title={text.offeringsTitle} description={text.offeringsDescription} toolbar={canManage && activeLevels.length && activeSubjects.length ? <CurriculumDialog levels={structure.gradeLevels} subjects={structure.subjects} messages={messages} trigger={<Button><Plus aria-hidden />{text.newOffering}</Button>} /> : undefined} footer={footer(structure.courseOfferings.length)}>
            {!structure.courseOfferings.length ? <Empty title={text.noOfferings} description={text.noOfferingsDescription} /> : <Table><TableHeader><TableRow><TableHead>{text.level}</TableHead><TableHead>{text.subject}</TableHead><TableHead>{text.subjectTrack}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.courseOfferings.map((item) => <TableRow key={item.id}><TableCell>{item.className}</TableCell><TableCell>{item.subjectName}</TableCell><TableCell>{trackLabel(item.track)}</TableCell><TableCell><div className="flex justify-end">{canManage && <LifecycleButton entity="offering" id={item.id} revision={item.revision} name={`${item.className} · ${item.subjectName}`} archived={false} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <DataTableShell title={text.profilesTitle} description={text.profilesDescription} toolbar={canManage ? <ProfileDialog messages={messages} trigger={<Button><Plus aria-hidden />{text.newProfile}</Button>} /> : undefined} footer={footer(structure.scheduleProfiles.length)}>
            {!structure.scheduleProfiles.length ? <Empty title={text.noProfiles} description={text.noProfilesDescription} /> : <Table><TableHeader><TableRow><TableHead>{text.profileCode}</TableHead><TableHead>{text.profileName}</TableHead><TableHead>{text.profileKind}</TableHead><TableHead>{messages.common.status}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.scheduleProfiles.map((profile) => <TableRow key={profile.id} className={profile.archived ? "opacity-65" : undefined}><TableCell>{profile.code}</TableCell><TableCell>{profile.name}</TableCell><TableCell>{profile.kind === "MORNING" ? text.profileMorning : profile.kind === "AFTERNOON" ? text.profileAfternoon : text.profileFullDay}</TableCell><TableCell><StatusBadge archived={profile.archived} messages={messages} /></TableCell><TableCell><div className="flex justify-end gap-2">{canManage && !profile.archived && <ProfileDialog profile={profile} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="profile" id={profile.id} revision={profile.revision} name={profile.name} archived={profile.archived} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
          <DataTableShell title={text.periodsTitle} description={text.periodsDescription} toolbar={canManage && activeProfiles.length ? <PeriodDialog profiles={structure.scheduleProfiles} nextSequence={nextPeriod} messages={messages} trigger={<Button><Plus aria-hidden />{text.newPeriod}</Button>} /> : undefined} footer={footer(structure.lessonPeriods.length)}>
            {!structure.lessonPeriods.length ? <Empty title={text.noPeriods} description={text.noPeriodsDescription} /> : <Table><TableHeader><TableRow><TableHead>{text.profile}</TableHead><TableHead>{messages.common.sequence}</TableHead><TableHead>{text.period}</TableHead><TableHead>{text.startTime}</TableHead><TableHead>{text.endTime}</TableHead><TableHead className="text-right">{messages.common.actions}</TableHead></TableRow></TableHeader><TableBody>{structure.lessonPeriods.map((period) => <TableRow key={period.id}><TableCell>{period.profileName}</TableCell><TableCell>{period.sequence}</TableCell><TableCell>{period.name}</TableCell><TableCell className="font-mono text-xs">{period.startTime}</TableCell><TableCell className="font-mono text-xs">{period.endTime}</TableCell><TableCell><div className="flex justify-end gap-2">{canManage && <PeriodDialog period={period} profiles={structure.scheduleProfiles} nextSequence={nextPeriod} messages={messages} trigger={editButton} />}{canManage && <LifecycleButton entity="period" id={period.id} revision={period.revision} name={`${period.profileName} · ${period.name}`} archived={false} messages={messages} />}</div></TableCell></TableRow>)}</TableBody></Table>}
          </DataTableShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
