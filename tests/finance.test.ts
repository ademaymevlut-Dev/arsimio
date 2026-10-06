import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStudentFinanceContractItemAmounts,
  formatStudentFinanceContractDisplayNumber,
  parseSaveStudentFinanceContract,
  parseSaveStudentFinanceContractItem,
} from "../src/lib/finance-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const contractId = "5b2985f2-a8c4-4fa2-bf7c-43ce4f2620d7";
const itemId = "812cdbf9-573c-43f8-a093-a267dc4ae86c";
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

test("student finance item parser calculates percentage discounts and net amount", () => {
  const parsed = parseSaveStudentFinanceContractItem(
    form({
      contractId,
      itemKind: "TUITION",
      itemDescription: " Shkollimi ",
      grossAmount: "3200",
      discountRate: "30",
      itemStatus: "ACTIVE",
      sortOrder: "10",
      itemNote: "Management approved discount.",
    }),
  );

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.itemId, null);
    assert.equal(parsed.data.kind, "TUITION");
    assert.equal(parsed.data.description, "Shkollimi");
    assert.equal(parsed.data.grossAmount, "3200.00");
    assert.equal(parsed.data.discountRate, "30.00");
    assert.equal(parsed.data.discountAmount, "960.00");
    assert.equal(parsed.data.netAmount, "2240.00");
    assert.equal(parsed.data.sortOrder, 10);
  }
});

test("student finance item parser accepts late fee as a positive manual item", () => {
  const parsed = parseSaveStudentFinanceContractItem(
    form({
      contractId,
      itemId,
      revision,
      itemKind: "LATE_FEE",
      itemDescription: "Gecikme bedeli",
      grossAmount: "12,50",
      discountRate: "0",
      itemStatus: "ACTIVE",
      sortOrder: "99",
    }),
  );

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.itemId, itemId);
    assert.equal(parsed.data.kind, "LATE_FEE");
    assert.equal(parsed.data.grossAmount, "12.50");
    assert.equal(parsed.data.discountAmount, "0.00");
    assert.equal(parsed.data.netAmount, "12.50");
  }
});

test("student finance item parser rejects invalid money, percent and identities", () => {
  const parsed = parseSaveStudentFinanceContractItem(
    form({
      contractId: "foreign",
      itemId,
      revision,
      itemKind: "SERVICE",
      itemDescription: "",
      grossAmount: "0",
      discountRate: "101",
      itemStatus: "PASSIVE",
      sortOrder: "-1",
      itemNote: "ok",
    }),
  );

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.contractId);
    assert.ok(parsed.state.fieldErrors?.itemKind);
    assert.ok(parsed.state.fieldErrors?.itemDescription);
    assert.ok(parsed.state.fieldErrors?.grossAmount);
    assert.ok(parsed.state.fieldErrors?.discountRate);
    assert.ok(parsed.state.fieldErrors?.itemStatus);
    assert.ok(parsed.state.fieldErrors?.sortOrder);
  }
});

test("student finance item amount calculation rounds discount cents", () => {
  assert.deepEqual(
    calculateStudentFinanceContractItemAmounts("100.01", "12.5"),
    {
      grossAmount: "100.01",
      discountRate: "12.50",
      discountAmount: "12.50",
      netAmount: "87.51",
    },
  );
});
