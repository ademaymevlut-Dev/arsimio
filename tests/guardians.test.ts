import assert from "node:assert/strict";
import test from "node:test";
import {
  parseArchiveGuardian,
  parseUpdateGuardian,
} from "../src/lib/guardian-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const personId = "8024d130-eeb2-4979-b3c4-fc44bc595394";
const revision = "2026-10-10T12:00:00.000Z";

test("guardian details normalize names and contact information", () => {
  const parsed = parseUpdateGuardian(
    form({
      personId,
      revision,
      firstName: " Meral ",
      middleName: " Mina ",
      lastName: " Ademay ",
      occupation: " Architect ",
      phone: "+383 44 123 456",
      email: "MERAL@example.com",
    }),
  );

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.firstName, "Meral");
    assert.equal(parsed.data.middleName, "Mina");
    assert.equal(parsed.data.email, "meral@example.com");
  }
});

test("guardian details reject invalid contact data", () => {
  const parsed = parseUpdateGuardian(
    form({
      personId,
      revision,
      firstName: "Meral",
      lastName: "Ademay",
      phone: "12",
      email: "not-an-email",
    }),
  );

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.state.fieldErrors?.phone);
    assert.ok(parsed.state.fieldErrors?.email);
  }
});

test("guardian archive requires a trusted person id and revision", () => {
  assert.equal(
    parseArchiveGuardian(form({ personId, revision })).success,
    true,
  );
  assert.equal(
    parseArchiveGuardian(
      form({ personId: "../other-school", revision }),
    ).success,
    false,
  );
  assert.equal(
    parseArchiveGuardian(
      form({ personId, revision: "not-a-revision" }),
    ).success,
    false,
  );
});
