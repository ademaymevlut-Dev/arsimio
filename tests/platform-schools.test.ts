import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BRANDING,
  normalizeColor,
  readableForeground,
  resolveBranding,
} from "../src/lib/school-branding";
import {
  parseBrandColors,
  parseSchoolProfile,
  validRevision,
  validSchoolId,
} from "../src/lib/platform-school-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("brand colors accept only six-digit hex and normalize safely", () => {
  assert.equal(normalizeColor(" #AAbBcC "), "#aabbcc");
  for (const bad of [
    "red",
    "#fff",
    "#12345678",
    "url(https://example.test)",
    "#ffffff;display:none",
    null,
    new Blob(),
  ])
    assert.equal(normalizeColor(bad), null);
});
test("missing legacy colors fall back without replacing valid school colors", () => {
  assert.deepEqual(resolveBranding(null), DEFAULT_BRANDING);
  assert.deepEqual(
    resolveBranding({ primaryColor: "#0F766E", accentColor: "bad" }),
    { ...DEFAULT_BRANDING, primaryColor: "#0f766e" },
  );
});
test("button and brand detail text remain readable on both dark and light colors", () => {
  assert.equal(readableForeground("#ffffff"), "#000000");
  assert.equal(readableForeground("#000000"), "#ffffff");
  assert.equal(readableForeground("#ffff00"), "#000000");
  assert.equal(readableForeground("#2563eb"), "#ffffff");
});
test("profile input is bounded and cannot change immutable fields", () => {
  assert.deepEqual(
    parseSchoolProfile(
      form({
        name: " HorizonEdu ",
        legalName: "  ",
        slug: "hacked",
        status: "ARCHIVED",
      }),
    ),
    { name: "HorizonEdu", legalName: null },
  );
  for (const values of [
    { name: "a", legalName: "" },
    { name: "a".repeat(201), legalName: "" },
    { name: "Okul", legalName: "b".repeat(241) },
    { name: "Okul\nAdı", legalName: "" },
  ])
    assert.equal(parseSchoolProfile(form(values)), null);
  assert.equal(parseSchoolProfile(form({ name: "Okul" })), null);
});
test("branding writes require all colors and exclude asset keys", () => {
  const values = {
    primaryColor: "#2563EB",
    secondaryColor: "#0f172a",
    accentColor: "#93c5fd",
  };
  assert.deepEqual(
    parseBrandColors(form({ ...values, logoAssetKey: "cannot-overwrite" })),
    { ...values, primaryColor: "#2563eb" },
  );
  assert.equal(parseBrandColors(form({ ...values, accentColor: "" })), null);
  const file = form(values);
  file.set("primaryColor", new Blob(["#2563eb"]));
  assert.equal(parseBrandColors(file), null);
});
test("school IDs and optimistic concurrency revisions are strictly validated", () => {
  assert.equal(validSchoolId("34837f18-bf73-4862-97e4-8689a1fe1133"), true);
  for (const value of ["../school", "1", null, new Blob()])
    assert.equal(validSchoolId(value), false);
  assert.equal(validRevision("2026-09-19T12:34:56.123Z"), true);
  for (const value of [
    "new",
    "invalid",
    "2026-02-30T12:34:56.000Z",
    "2026-09-19",
    null,
  ])
    assert.equal(validRevision(value), false);
});
