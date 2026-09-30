import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAddGuardian,
  parseCreateStudent,
  parseSetPrimaryGuardian,
  parseStudentTransition,
} from "../src/lib/student-validation";

function form(values: Record<string, string | boolean>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values))
    if (typeof value === "boolean") {
      if (value) data.set(key, "on");
    } else data.set(key, value);
  return data;
}

const studentId = "2f9d5c1e-874c-4cef-9584-07ff73e74827";
const yearId = "25a01724-71bb-48bc-879c-1298c951d3c0";
const classId = "8bc89aad-a709-451c-aa20-e2505b5be0fd";
const personId = "8024d130-eeb2-4979-b3c4-fc44bc595394";
const relationshipId = "0b9a5fbf-d073-42c6-a314-a6de017409a1";
const revision = "2026-09-30T12:00:00.000Z";

test("student registration accepts a person, optional protected identity, and annual placement", () => {
  const parsed = parseCreateStudent(
    form({
      firstName: " Ada ",
      middleName: " Mina ",
      lastName: " Yılmaz ",
      birthDate: "2018-05-10",
      birthPlace: "Prishtina",
      nationality: "Kosova",
      sex: "FEMALE",
      identityType: "NATIONAL_ID",
      identityValue: " 1234-5678 ",
      identityCountry: "xk",
      academicYearId: yearId,
      classSectionId: classId,
      admittedOn: "2026-09-01",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.firstName, "Ada");
    assert.equal(parsed.data.identity?.countryCode, "XK");
    assert.equal(parsed.data.academicYearClassSectionId, classId);
  }
});

test("student registration rejects rolled dates, invalid identity, and foreign identifiers", () => {
  const parsed = parseCreateStudent(
    form({
      firstName: "Ada",
      lastName: "Yılmaz",
      birthDate: "2018-02-30",
      sex: "UNKNOWN",
      identityType: "NATIONAL_ID",
      identityValue: "x",
      identityCountry: "KOS",
      academicYearId: "../foreign",
      classSectionId: classId,
      admittedOn: "2026-09-01",
    }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.birthDate);
    assert.ok(parsed.state.fieldErrors?.identityValue);
    assert.ok(parsed.state.fieldErrors?.identityCountry);
    assert.ok(parsed.state.fieldErrors?.academicYearId);
  }
});

test("guardian input distinguishes linking an existing person from creating a new one", () => {
  const existing = parseAddGuardian(
    form({
      studentProfileId: studentId,
      mode: "existing",
      guardianPersonId: personId,
      relationshipType: "MOTHER",
      isLegalGuardian: true,
      isPrimaryContact: true,
    }),
  );
  assert.equal(existing.success, true);
  if (existing.success) {
    assert.equal(existing.data.guardianPersonId, personId);
    assert.equal(existing.data.firstName, null);
    assert.equal(existing.data.isPrimaryContact, true);
  }

  const created = parseAddGuardian(
    form({
      studentProfileId: studentId,
      mode: "new",
      relationshipType: "FATHER",
      firstName: "Arben",
      lastName: "Yılmaz",
      phone: "+383 44 123 456",
      email: "ARBEN@example.com",
    }),
  );
  assert.equal(created.success, true);
  if (created.success) {
    assert.equal(created.data.guardianPersonId, null);
    assert.equal(created.data.email, "arben@example.com");
  }
});

test("primary guardian and lifecycle changes require trusted record identities", () => {
  assert.equal(
    parseSetPrimaryGuardian(
      form({ studentProfileId: studentId, relationshipId }),
    ).success,
    true,
  );
  assert.equal(
    parseSetPrimaryGuardian(
      form({ studentProfileId: "other-school", relationshipId }),
    ).success,
    false,
  );

  assert.equal(
    parseStudentTransition(
      form({
        studentProfileId: studentId,
        revision,
        transition: "inactive",
        effectiveOn: "2026-10-01",
        exitReason: "OTHER_SCHOOL",
        note: "Family request",
      }),
    ).success,
    true,
  );
  assert.equal(
    parseStudentTransition(
      form({
        studentProfileId: studentId,
        revision,
        transition: "inactive",
        effectiveOn: "2026-10-01",
      }),
    ).success,
    false,
  );
});
