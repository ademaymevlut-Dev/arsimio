import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCourseTeacherAssignment,
  parseHomeroomTeacherAssignment,
  parseTimetableParticipantTransition,
  parseTeachingAssignmentTransition,
  parseWeeklySchedulePlacement,
} from "../src/lib/teaching-validation";
import {
  parseExamNotification,
  parseHomework,
  parseLessonTopic,
  parseStudentAttendance,
  parseStudentComments,
} from "../src/lib/teacher-cta-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const teacherProfileId = "07e9957c-9a4d-4e28-98d4-15e60c6264d2";
const classSectionId = "c0f3fa91-0988-40cd-ad45-c80447bfbf6c";
const courseOfferingId = "4f62dcb1-3972-4198-985b-12ea6da6e4cc";
const assignmentId = "eb2c5d9f-d24d-4434-9640-5df0b7a9f081";
const schedulePeriodId = "3d27c070-8cde-45e4-a0e0-10cbd3aaf7ea";
const timetableParticipantId = "ef7be8cc-5b14-4d5f-b913-8ce93bbf08f4";
const academicCalendarDayId = "a3bd7f23-46d5-4d46-bef6-6eb3e549cc41";
const studentProfileId = "d4eb86d1-20c7-48ce-a015-a8dccdcf040e";
const secondStudentProfileId = "5af27049-e372-477f-b3ad-f9218da37edb";
const revision = "2026-10-01T12:00:00.000Z";

test("homeroom assignment accepts teacher, class and date", () => {
  const parsed = parseHomeroomTeacherAssignment(
    form({
      teacherProfileId,
      academicYearClassSectionId: classSectionId,
      effectiveFrom: "2026-09-01",
      note: "  first assignment ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.teacherProfileId, teacherProfileId);
    assert.equal(parsed.data.academicYearClassSectionId, classSectionId);
    assert.equal(parsed.data.note, "first assignment");
    assert.equal(parsed.data.effectiveFrom.toISOString().slice(0, 10), "2026-09-01");
  }
});

test("course teacher assignment rejects invalid identities and rollover dates", () => {
  const parsed = parseCourseTeacherAssignment(
    form({
      teacherProfileId: "../not-a-uuid",
      courseOfferingId,
      effectiveFrom: "2026-02-30",
      note: "",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.teacherProfileId);
    assert.ok(parsed.state.fieldErrors?.effectiveFrom);
  }
});

test("assignment transition accepts only known kinds and revision format", () => {
  assert.equal(
    parseTeachingAssignmentTransition(
      form({
        assignmentKind: "homeroom",
        assignmentId,
        revision,
        effectiveOn: "2026-10-15",
        note: "passive",
      }),
    ).success,
    true,
  );
  assert.equal(
    parseTeachingAssignmentTransition(
      form({
        assignmentKind: "schedule",
        assignmentId,
        revision: "bad-revision",
        effectiveOn: "2026-10-15",
        note: "",
      }),
    ).success,
    false,
  );
});

test("weekly schedule placement accepts active assignment, weekday and period", () => {
  const parsed = parseWeeklySchedulePlacement(
    form({
      teacherProfileId,
      courseTeacherAssignmentId: assignmentId,
      schedulePeriodId,
      weekday: "MONDAY",
      effectiveFrom: "2026-10-01",
      mergeWithTeacherSession: "on",
      allowClassConflict: "on",
      note: "  joint class ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.courseTeacherAssignmentId, assignmentId);
    assert.equal(parsed.data.schedulePeriodId, schedulePeriodId);
    assert.equal(parsed.data.weekday, "MONDAY");
    assert.equal(parsed.data.mergeWithTeacherSession, true);
    assert.equal(parsed.data.allowClassConflict, true);
    assert.equal(parsed.data.note, "joint class");
  }
});

test("weekly schedule placement rejects invalid weekday and period", () => {
  const parsed = parseWeeklySchedulePlacement(
    form({
      teacherProfileId,
      courseTeacherAssignmentId: assignmentId,
      schedulePeriodId: "bad-period",
      weekday: "SUNDAY",
      effectiveFrom: "2026-10-01",
      note: "",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.schedulePeriodId);
    assert.ok(parsed.state.fieldErrors?.weekday);
  }
});

test("timetable participant transition validates revision and date", () => {
  assert.equal(
    parseTimetableParticipantTransition(
      form({
        timetableParticipantId,
        revision,
        effectiveOn: "2026-10-15",
        note: "remove from timetable",
      }),
    ).success,
    true,
  );
  const parsed = parseTimetableParticipantTransition(
    form({
      timetableParticipantId,
      revision: "not-a-date",
      effectiveOn: "2026-10-40",
      note: "",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.record);
    assert.ok(parsed.state.fieldErrors?.effectiveOn);
  }
});

test("lesson topic accepts one note with emoji and new lines", () => {
  const parsed = parseLessonTopic(
    form({
      timetableParticipantId,
      academicCalendarDayId,
      content: "  Kesirlerde toplama çalışıldı 😊\nKitap sayfa 42  ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.timetableParticipantId, timetableParticipantId);
    assert.equal(parsed.data.academicCalendarDayId, academicCalendarDayId);
    assert.equal(
      parsed.data.content,
      "Kesirlerde toplama çalışıldı 😊\nKitap sayfa 42",
    );
  }
});

test("lesson topic rejects invalid context and blank note", () => {
  const parsed = parseLessonTopic(
    form({
      timetableParticipantId: "not-a-uuid",
      academicCalendarDayId,
      content: "   ",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.timetableParticipantId);
    assert.ok(parsed.state.fieldErrors?.content);
  }
});

test("homework accepts title and teacher note with emoji and new lines", () => {
  const parsed = parseHomework(
    form({
      timetableParticipantId,
      academicCalendarDayId,
      title: "  Kesirler çalışma kağıdı 😊  ",
      content: "  1-20 arası soruları çözün.\nDeftere yazılacak.  ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.timetableParticipantId, timetableParticipantId);
    assert.equal(parsed.data.academicCalendarDayId, academicCalendarDayId);
    assert.equal(parsed.data.title, "Kesirler çalışma kağıdı 😊");
    assert.equal(
      parsed.data.content,
      "1-20 arası soruları çözün.\nDeftere yazılacak.",
    );
  }
});

test("homework rejects invalid context, blank title and blank note", () => {
  const parsed = parseHomework(
    form({
      timetableParticipantId,
      academicCalendarDayId: "not-a-uuid",
      title: "   ",
      content: "   ",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.academicCalendarDayId);
    assert.ok(parsed.state.fieldErrors?.title);
    assert.ok(parsed.state.fieldErrors?.content);
  }
});

test("exam notification accepts one note with emoji and new lines", () => {
  const parsed = parseExamNotification(
    form({
      timetableParticipantId,
      academicCalendarDayId,
      content: "  1. dönem sınavı 😊\nKonular: kesirler  ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.timetableParticipantId, timetableParticipantId);
    assert.equal(parsed.data.academicCalendarDayId, academicCalendarDayId);
    assert.equal(parsed.data.content, "1. dönem sınavı 😊\nKonular: kesirler");
  }
});

test("exam notification rejects invalid context and blank note", () => {
  const parsed = parseExamNotification(
    form({
      timetableParticipantId: "not-a-uuid",
      academicCalendarDayId,
      content: "   ",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.timetableParticipantId);
    assert.ok(parsed.state.fieldErrors?.content);
  }
});

test("student comments accept multiple students, category points and emoji", () => {
  const data = form({
    timetableParticipantId,
    academicCalendarDayId,
    category: "GREEN_CARD",
    content: "  Derse çok iyi katıldı 😊\nTebrikler.  ",
  });
  data.append("studentProfileIds", studentProfileId);
  data.append("studentProfileIds", secondStudentProfileId);
  const parsed = parseStudentComments(data);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.studentProfileIds, [
      studentProfileId,
      secondStudentProfileId,
    ]);
    assert.equal(parsed.data.category, "GREEN_CARD");
    assert.equal(parsed.data.point, 3);
    assert.equal(parsed.data.content, "Derse çok iyi katıldı 😊\nTebrikler.");
  }
});

test("student comments reject empty student selection, category and note", () => {
  const parsed = parseStudentComments(
    form({
      timetableParticipantId,
      academicCalendarDayId,
      category: "UNKNOWN",
      content: "   ",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.studentProfileIds);
    assert.ok(parsed.state.fieldErrors?.category);
    assert.ok(parsed.state.fieldErrors?.content);
  }
});

test("student attendance accepts absent, late and clear changes", () => {
  const data = form({
    timetableParticipantId,
    academicCalendarDayId,
  });
  data.append("absentStudentProfileIds", studentProfileId);
  data.append("lateStudentProfileIds", secondStudentProfileId);
  data.append("clearStudentProfileIds", teacherProfileId);
  const parsed = parseStudentAttendance(data);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.absentStudentProfileIds, [studentProfileId]);
    assert.deepEqual(parsed.data.lateStudentProfileIds, [
      secondStudentProfileId,
    ]);
    assert.deepEqual(parsed.data.clearStudentProfileIds, [teacherProfileId]);
  }
});

test("student attendance rejects no-op and overlapping student changes", () => {
  const noChange = parseStudentAttendance(
    form({ timetableParticipantId, academicCalendarDayId }),
  );
  assert.equal(noChange.success, false);
  if (!noChange.success) {
    assert.ok(noChange.state.fieldErrors?.studentProfileIds);
  }

  const data = form({ timetableParticipantId, academicCalendarDayId });
  data.append("absentStudentProfileIds", studentProfileId);
  data.append("lateStudentProfileIds", studentProfileId);
  const overlapping = parseStudentAttendance(data);
  assert.equal(overlapping.success, false);
  if (!overlapping.success) {
    assert.ok(overlapping.state.fieldErrors?.studentProfileIds);
  }
});
