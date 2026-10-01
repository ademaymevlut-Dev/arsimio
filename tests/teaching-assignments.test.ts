import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCourseTeacherAssignment,
  parseHomeroomTeacherAssignment,
  parseTeachingAssignmentTransition,
} from "../src/lib/teaching-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const teacherProfileId = "07e9957c-9a4d-4e28-98d4-15e60c6264d2";
const classSectionId = "c0f3fa91-0988-40cd-ad45-c80447bfbf6c";
const courseOfferingId = "4f62dcb1-3972-4198-985b-12ea6da6e4cc";
const assignmentId = "eb2c5d9f-d24d-4434-9640-5df0b7a9f081";
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
