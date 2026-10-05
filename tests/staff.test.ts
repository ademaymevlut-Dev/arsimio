import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCreateEmployment,
  parseEmploymentTransition,
  parseSaveEmploymentCompensation,
  parseSaveEmploymentContract,
  parseStaffCatalogItem,
  parseStaffCatalogTransition,
  parseTeacherProfile,
  parseUpdateStaffHrProfile,
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
const catalogId = "4e7a0b1a-0b18-4af9-86ac-3e57adfd7767";
const contractId = "5b2985f2-a8c4-4fa2-bf7c-43ce4f2620d7";
const compensationId = "46f9279e-0951-4805-86f3-77f478d7800a";
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
      titleTr: "Tarih Ogretmeni",
      titleSq: "Mësues historie",
      titleEn: "History Teacher",
      subjectIds: [subjectOne, subjectTwo, subjectOne],
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.subjectIds, [subjectOne, subjectTwo]);
    assert.equal(parsed.data.title.tr, "Tarih Ogretmeni");
    assert.equal(parsed.data.title.sq, "Mësues historie");
    assert.equal(parsed.data.title.en, "History Teacher");
  }
});

test("staff HR profile accepts address, emergency contact and protected identity metadata", () => {
  const parsed = parseUpdateStaffHrProfile(
    form({
      employmentId,
      revision,
      residenceCity: "Prishtina",
      neighborhood: "Qendra",
      addressLine: "Rruga kryesore 12",
      emergencyContactName: "Arben Gashi",
      emergencyContactRelation: "Brother",
      emergencyContactPhone: "+38349111222",
      internalNote: "Keep contract papers in the office file.",
      identityType: "PASSPORT",
      identityValue: "AB 123456",
      identityCountry: "xk",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.residenceCity, "Prishtina");
    assert.equal(parsed.data.identity?.type, "PASSPORT");
    assert.equal(parsed.data.identity?.countryCode, "XK");
  }

  const invalid = parseUpdateStaffHrProfile(
    form({
      employmentId,
      revision,
      identityType: "NATIONAL_ID",
      identityCountry: "XK",
    }),
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.ok(invalid.state.fieldErrors?.identityCountry);
});

test("employment contract parser accepts manual contract numbers and optional end dates", () => {
  const parsed = parseSaveEmploymentContract(
    form({
      employmentId,
      contractNumber: "PRAKTIKE-2025/10-BI",
      contractType: "INTERN",
      contractStatus: "ACTIVE",
      contractStartedOn: "2026-10-01",
      contractEndedOn: "",
      contractNote: "Manual school contract reference.",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.contractId, null);
    assert.equal(parsed.data.contractNumber, "PRAKTIKE-2025/10-BI");
    assert.equal(parsed.data.type, "INTERN");
    assert.equal(parsed.data.endedOn, null);
  }

  const update = parseSaveEmploymentContract(
    form({
      employmentId,
      contractId,
      revision,
      contractNumber: "PRAKTIKE-2025/10-BI",
      contractType: "INTERN",
      contractStatus: "ENDED",
      contractStartedOn: "2026-10-01",
      contractEndedOn: "2026-09-30",
    }),
  );
  assert.equal(update.success, false);
  if (!update.success) assert.ok(update.state.fieldErrors?.contractEndedOn);
});

test("employment compensation parser normalizes amount, currency and dates", () => {
  const parsed = parseSaveEmploymentCompensation(
    form({
      employmentId,
      compensationAmount: "320,37",
      compensationCurrency: "eur",
      compensationAmountKind: "GROSS",
      compensationPayType: "MONTHLY",
      compensationStatus: "ACTIVE",
      compensationStartedOn: "2026-10-01",
      compensationEndedOn: "",
      compensationNote: "Contract salary line.",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.compensationId, null);
    assert.equal(parsed.data.amount, "320.37");
    assert.equal(parsed.data.currencyCode, "EUR");
    assert.equal(parsed.data.amountKind, "GROSS");
    assert.equal(parsed.data.payType, "MONTHLY");
    assert.equal(parsed.data.endedOn, null);
  }

  const update = parseSaveEmploymentCompensation(
    form({
      employmentId,
      compensationId,
      revision,
      compensationAmount: "0",
      compensationCurrency: "EURO",
      compensationAmountKind: "NET",
      compensationPayType: "LESSON",
      compensationStatus: "ENDED",
      compensationStartedOn: "2026-10-01",
      compensationEndedOn: "2026-09-30",
    }),
  );
  assert.equal(update.success, false);
  if (!update.success) {
    assert.ok(update.state.fieldErrors?.compensationAmount);
    assert.ok(update.state.fieldErrors?.compensationCurrency);
    assert.ok(update.state.fieldErrors?.compensationEndedOn);
  }
});

test("staff catalog item requires a code and three translated names", () => {
  const parsed = parseStaffCatalogItem(
    form({
      catalogKind: "department",
      code: " education ",
      nameTr: "Eğitim",
      nameSq: "Arsimi",
      nameEn: "Education",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.kind, "department");
    assert.equal(parsed.data.catalogId, null);
    assert.equal(parsed.data.code, "EDUCATION");
    assert.equal(parsed.data.name.sq, "Arsimi");
  }

  const invalid = parseStaffCatalogItem(
    form({
      catalogKind: "position",
      catalogId,
      revision,
      code: "!",
      nameTr: "Öğretmen",
      nameSq: "",
      nameEn: "Teacher",
    }),
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.ok(invalid.state.fieldErrors?.code);
    assert.ok(invalid.state.fieldErrors?.nameSq);
  }
});

test("staff catalog archive and restore actions require trusted record metadata", () => {
  const parsed = parseStaffCatalogTransition(
    form({
      catalogKind: "position",
      catalogId,
      revision,
      transition: "archive",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.kind, "position");
    assert.equal(parsed.data.transition, "archive");
  }

  const invalid = parseStaffCatalogTransition(
    form({
      catalogKind: "department",
      catalogId: "foreign",
      revision,
      transition: "restore",
    }),
  );
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.ok(invalid.state.fieldErrors?.catalogId);
});
