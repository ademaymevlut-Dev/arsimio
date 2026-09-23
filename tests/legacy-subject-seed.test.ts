import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGACY_SUBJECT_CATALOG } from "../scripts/data/legacy-subject-catalog";
import { planSubjectSeed } from "../scripts/lib/subject-seed-plan";

test("legacy screenshot catalog has 49 unique trilingual entries and expected tracks", () => {
  assert.equal(LEGACY_SUBJECT_CATALOG.length, 49);
  for (const locale of ["tr", "sq", "en"] as const) {
    assert.equal(
      new Set(LEGACY_SUBJECT_CATALOG.map((entry) => entry[locale])).size,
      LEGACY_SUBJECT_CATALOG.length,
    );
  }
  assert.equal(LEGACY_SUBJECT_CATALOG.filter((entry) => entry.track === "ELECTIVE").length, 13);
  assert.equal(LEGACY_SUBJECT_CATALOG.filter((entry) => entry.track === "IGCSE").length, 5);
});

test("seed plan is idempotent and flags existing translation or track differences", () => {
  const math = LEGACY_SUBJECT_CATALOG.find((entry) => entry.sq === "Matematikë")!;
  const existing = {
    id: "existing-math",
    track: math.track,
    archivedAt: null,
    translations: (["tr", "sq", "en"] as const).map((locale) => ({
      locale,
      name: math[locale],
    })),
  };
  const plan = planSubjectSeed([math], [existing]);
  assert.equal(plan.create.length, 0);
  assert.deepEqual(plan.unchanged, ["Matematikë"]);
  assert.equal(plan.conflicts.length, 0);

  const changed = planSubjectSeed([math], [{ ...existing, track: "IGCSE" }]);
  assert.equal(changed.create.length, 0);
  assert.equal(changed.conflicts.length, 1);

  const otherName = planSubjectSeed(
    [{ ...math, sq: "Matematikë tjetër" }],
    [existing],
  );
  assert.equal(otherName.create.length, 0);
  assert.equal(otherName.conflicts.length, 1);
});
