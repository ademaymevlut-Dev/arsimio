import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCreateEmployment,
  parseEmploymentTransition,
  parseTeacherProfile,
} from "../src/lib/staff-validation";

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, item);
    } else data.set(key, value);
  }
  return data;
}

const personId = "8024d130-eeb2-4979-b3c4-fc44bc595394";
const employmentId = "2f9d5c1e-874c-4cef-9584-07ff73e74827";
const departmentId = "25a01724-71bb-48bc-879c-1298c951d3c0";
const positionId = "8bc89aad-a709-451c-aa20-e2505b5be0fd";
const subjectOne = "0b9a5fbf-d073-42c6-a314-a6de017409a1";
const subjectTwo = "32bbbf77-cb2a-4b2e-83ac-6b138c0e0d4a";
const revision = "2026-10-01T12:00:00.000Z";

test("employment registration supports an existing real person", () => {
  const parsed = parseCreateEmployment(
    form({
      mode: "existing",
      personId,
      hiredOn: "2026-10-01",
      employmentType: "FULL_TIME",
      departmentId,
      positionId,
      note: "Previously registered guardian.",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.personId, personId);
    assert.equal(parsed.data.firstName, null);
    assert.equal(parsed.data.employmentType, "FULL_TIME");
  }
});

test("employment registration validates required new-person and catalog fields", () => {
  const parsed = parseCreateEmployment(
    form({
      mode: "new",
      firstName: "  Aylin ",
      lastName: " Demir ",
      email: "AYLIN@example.com",
      hiredOn: "2026-02-30",
      employmentType: "GUEST",
      departmentId: "foreign",
      positionId,
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.hiredOn);
    assert.ok(parsed.state.fieldErrors?.employmentType);
    assert.ok(parsed.state.fieldErrors?.departmentId);
  }
});

test("ending an employment requires a selectable reason and trusted revision", () => {
  const invalid = parseEmploymentTransition(
    form({
      employmentId,
      revision,
      transition: "end",
      effectiveOn: "2026-10-01",
    }),
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.ok(invalid.state.fieldErrors?.exitReason);

  const parsed = parseEmploymentTransition(
    form({
      employmentId,
      revision,
      transition: "end",
      effectiveOn: "2026-10-01",
      exitReason: "TERMINATED",
      note: "Board decision.",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.exitReason, "TERMINATED");
});

test("teacher profile keeps capability subjects separate from annual assignments", () => {
  const parsed = parseTeacherProfile(
    form({
      employmentId,
      category: "BRANCH",
      teacherStatus: "ACTIVE",
      title: "Tarih Ogretmeni",
      subjectIds: [subjectOne, subjectTwo, subjectOne],
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.subjectIds, [subjectOne, subjectTwo]);
    assert.equal(parsed.data.title, "Tarih Ogretmeni");
  }
});
