import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStudentFinanceContractDisplayNumber,
  parseSaveStudentFinanceContract,
} from "../src/lib/finance-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const contractId = "5b2985f2-a8c4-4fa2-bf7c-43ce4f2620d7";
const studentProfileId = "2f9d5c1e-874c-4cef-9584-07ff73e74827";
const academicYearId = "25a01724-71bb-48bc-879c-1298c951d3c0";
const guardianRelationshipId = "0b9a5fbf-d073-42c6-a314-a6de017409a1";
const revision = "2026-10-06T12:00:00.000Z";

test("student finance contract parser accepts yearly protocol records", () => {
  const parsed = parseSaveStudentFinanceContract(
    form({
      studentProfileId,
      academicYearId,
      responsibleGuardianRelationshipId: guardianRelationshipId,
      protocolNumber: " 161/17 ",
      contractStatus: "ACTIVE",
      currencyCode: "eur",
      issuedOn: "2026-10-06",
      note: "Primary annual protocol.",
    }),
  );

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.contractId, null);
    assert.equal(parsed.data.protocolNumber, "161/17");
    assert.equal(parsed.data.status, "ACTIVE");
    assert.equal(parsed.data.currencyCode, "EUR");
    assert.equal(parsed.data.note, "Primary annual protocol.");
  }
});

test("student finance contract parser validates trusted identifiers and contract metadata", () => {
  const parsed = parseSaveStudentFinanceContract(
    form({
      contractId,
      revision,
      studentProfileId: "foreign",
      academicYearId,
      responsibleGuardianRelationshipId: guardianRelationshipId,
      protocolNumber: "",
      contractStatus: "DONE",
      currencyCode: "EURO",
      issuedOn: "2026-02-30",
      note: "ok",
    }),
  );

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.studentProfileId);
    assert.ok(parsed.state.fieldErrors?.protocolNumber);
    assert.ok(parsed.state.fieldErrors?.contractStatus);
    assert.ok(parsed.state.fieldErrors?.currencyCode);
    assert.ok(parsed.state.fieldErrors?.issuedOn);
  }
});

test("student finance display number combines academic year and protocol", () => {
  assert.equal(
    formatStudentFinanceContractDisplayNumber("2024 / 2025", " 161/17 "),
    "2024 / 2025 - Protocol 161/17",
  );
});
