import assert from "node:assert/strict";
import test from "node:test";
import { parseInitialSchoolAdmin } from "../src/lib/initial-school-admin-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  firstName: " Mevlüt ",
  lastName: " Ademay ",
  username: " Okul.Admin ",
  password: "Guclu-baslangic-2026",
  passwordConfirmation: "Guclu-baslangic-2026",
};

test("initial school admin input normalizes names and school username", () => {
  const result = parseInitialSchoolAdmin(form(valid));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    firstName: "Mevlüt",
    lastName: "Ademay",
    username: "okul.admin",
    password: valid.password,
  });
});

test("initial school admin rejects malformed profile and username fields", () => {
  for (const values of [
    { ...valid, firstName: "A" },
    { ...valid, lastName: "\nAdmin" },
    { ...valid, username: "../admin" },
    { ...valid, username: "ab" },
  ]) {
    const result = parseInitialSchoolAdmin(form(values));
    assert.equal(result.success, false);
    if (result.success) continue;
    assert.equal(result.state.status, "error");
    assert.ok(result.state.fieldErrors);
  }
});

test("initial school admin requires a bounded matching password", () => {
  const short = parseInitialSchoolAdmin(
    form({ ...valid, password: "short", passwordConfirmation: "short" }),
  );
  assert.equal(short.success, false);
  if (!short.success) assert.ok(short.state.fieldErrors?.password);

  const mismatch = parseInitialSchoolAdmin(
    form({ ...valid, passwordConfirmation: "Baska-parola-2026" }),
  );
  assert.equal(mismatch.success, false);
  if (!mismatch.success)
    assert.ok(mismatch.state.fieldErrors?.passwordConfirmation);
});

test("validation errors never echo submitted passwords", () => {
  const secret = "Cok-gizli-parola-2026";
  const result = parseInitialSchoolAdmin(
    form({
      ...valid,
      username: "invalid username",
      password: secret,
      passwordConfirmation: secret,
    }),
  );
  assert.equal(result.success, false);
  if (!result.success)
    assert.equal(JSON.stringify(result.state).includes(secret), false);
});

