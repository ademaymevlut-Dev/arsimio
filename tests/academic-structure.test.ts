import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAcademicStructureTransition,
  parseClassSection,
  parseCourseOffering,
  parseEducationStage,
  parseGradeLevel,
  parseLessonPeriod,
  parseScheduleProfile,
  parseSubject,
  parseTimeValue,
  timeValue,
} from "../src/lib/academic-structure-validation";

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, item);
    } else {
      data.set(key, value);
    }
  }
  return data;
}

const stageId = "865501af-fab8-4944-ac73-34794527aaf4";
const levelId = "2a80c4c7-5a59-4e34-80d7-ec80b6a99050";
const profileId = "d2732845-0a08-4409-b7ec-f75a54c105ac";
const subjectId = "3b0852f1-53a4-43a3-a4cc-a1705f65e3fd";
const revision = "2026-09-22T08:00:00.000Z";

const names = {
  nameTr: "Matematik",
  nameSq: "Matematikë",
  nameEn: "Mathematics",
};

test("education stages keep one identity with three localized names", () => {
  const parsed = parseEducationStage(
    form({
      id: "new",
      revision: "new",
      code: " PRIMARY ",
      sequence: "2",
      nameTr: " İlkokul ",
      nameSq: " Shkolla fillore ",
      nameEn: " Primary School ",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.code, "PRIMARY");
    assert.deepEqual(parsed.data.names, {
      tr: "İlkokul",
      sq: "Shkolla fillore",
      en: "Primary School",
    });
  }
});

test("levels and sections require school-scoped parent UUIDs", () => {
  assert.equal(
    parseGradeLevel(
      form({
        id: "new",
        revision: "new",
        educationStageId: stageId,
        code: "4",
        displayLabel: "4. Sınıf",
        sequence: "5",
      }),
    ).success,
    true,
  );
  assert.equal(
    parseClassSection(
      form({
        id: "new",
        revision: "new",
        gradeLevelId: levelId,
        code: "1",
        sequence: "1",
      }),
    ).success,
    true,
  );
  assert.equal(
    parseGradeLevel(
      form({
        id: "new",
        revision: "new",
        educationStageId: "other-school",
        code: "4",
        displayLabel: "4. Sınıf",
        sequence: "5",
      }),
    ).success,
    false,
  );
});

test("subject catalog requires Turkish, Albanian and English on one record", () => {
  assert.equal(
    parseSubject(form({ id: "new", revision: "new", track: "ELECTIVE", ...names })).success,
    true,
  );
  assert.equal(
    parseSubject(
      form({ id: "new", revision: "new", track: "ELECTIVE", ...names, nameSq: "" }),
    ).success,
    false,
  );
  assert.equal(
    parseSubject(form({ id: "new", revision: "new", track: "UNKNOWN", ...names })).success,
    false,
  );
});

test("curriculum batch requires one level and a valid type for every unique subject", () => {
  const parsed = parseCourseOffering(
    form({
      gradeLevelId: levelId,
      subjectIds: [subjectId, subjectId],
      [`track:${subjectId}`]: "GENERAL",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.items.length, 1);
  assert.equal(
    parseCourseOffering(
      form({
        gradeLevelId: "bad",
        subjectIds: subjectId,
        [`track:${subjectId}`]: "GENERAL",
      }),
    ).success,
    false,
  );
  assert.equal(
    parseCourseOffering(
      form({ gradeLevelId: levelId, subjectIds: subjectId }),
    ).success,
    false,
  );
});

test("schedule profiles reject migration-only kinds", () => {
  assert.equal(
    parseScheduleProfile(
      form({ id: "new", revision: "new", code: "MORNING", name: "Sabahçı", profileKind: "MORNING" }),
    ).success,
    true,
  );
  assert.equal(
    parseScheduleProfile(
      form({ id: "new", revision: "new", code: "OLD", name: "Eski", profileKind: "UNCLASSIFIED" }),
    ).success,
    false,
  );
});

test("lesson periods parse profile-local wall-clock times and reject reversed ranges", () => {
  const time = parseTimeValue("08:45");
  assert.ok(time);
  assert.equal(timeValue(time), "08:45");
  assert.equal(parseTimeValue("24:00"), null);
  assert.equal(
    parseLessonPeriod(
      form({
        id: "new",
        revision: "new",
        profileId,
        code: "P1",
        ...names,
        sequence: "1",
        startTime: "08:00",
        endTime: "08:45",
      }),
    ).success,
    true,
  );
  assert.equal(
    parseLessonPeriod(
      form({
        id: "new",
        revision: "new",
        profileId,
        code: "P2",
        ...names,
        sequence: "1",
        startTime: "09:00",
        endTime: "08:45",
      }),
    ).success,
    false,
  );
});

test("archive and restore transitions accept only trusted identities", () => {
  assert.deepEqual(
    parseAcademicStructureTransition(
      form({ entity: "subject", transition: "archive", id: subjectId, revision }),
    ),
    { entity: "subject", transition: "archive", id: subjectId, revision },
  );
  assert.equal(
    parseAcademicStructureTransition(
      form({ entity: "calendar", transition: "delete", id: subjectId, revision }),
    ),
    null,
  );
});
