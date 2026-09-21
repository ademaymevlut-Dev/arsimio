import assert from "node:assert/strict";
import test from "node:test";
import {
  dateOnlyValue,
  parseAcademicTerm,
  parseAcademicTransition,
  parseAcademicYear,
  parseDateOnly,
} from "../src/lib/academic-calendar-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const id = "34837f18-bf73-4862-97e4-8689a1fe1133";
const revision = "2026-09-21T09:30:00.000Z";

test("date-only values reject rollover dates and round-trip in UTC", () => {
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseDateOnly("21/09/2026"), null);
  assert.equal(dateOnlyValue(parseDateOnly("2026-09-21")!), "2026-09-21");
});

test("academic year accepts create and update identities with bounded dates", () => {
  const created = parseAcademicYear(
    form({
      id: "new",
      revision: "new",
      name: " 2026 / 2027 ",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    }),
  );
  assert.equal(created.success, true);
  if (created.success) {
    assert.equal(created.data.id, null);
    assert.equal(created.data.name, "2026 / 2027");
  }
  assert.equal(
    parseAcademicYear(
      form({
        id,
        revision,
        name: "2026 / 2027",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
      }),
    ).success,
    true,
  );
});

test("academic year rejects bad names, dates and untrusted identities", () => {
  for (const values of [
    {
      id: "new",
      revision: "new",
      name: "x",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    },
    {
      id: "new",
      revision: "new",
      name: "2026 / 2027",
      startDate: "2027-09-01",
      endDate: "2027-06-30",
    },
    {
      id: "../other-school",
      revision,
      name: "2026 / 2027",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    },
  ])
    assert.equal(parseAcademicYear(form(values)).success, false);
});

test("academic term validates year ownership reference, sequence and dates", () => {
  const parsed = parseAcademicTerm(
    form({
      id: "new",
      revision: "new",
      academicYearId: id,
      name: " 1. Dönem ",
      sequence: "1",
      startDate: "2026-09-01",
      endDate: "2027-01-31",
    }),
  );
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.sequence, 1);
  for (const sequence of ["0", "21", "1.5", "x"])
    assert.equal(
      parseAcademicTerm(
        form({
          id: "new",
          revision: "new",
          academicYearId: id,
          name: "Dönem",
          sequence,
          startDate: "2026-09-01",
          endDate: "2027-01-31",
        }),
      ).success,
      false,
    );
});

test("academic lifecycle transitions accept only known entities and actions", () => {
  assert.deepEqual(
    parseAcademicTransition(
      form({ entity: "year", transition: "activate", id, revision }),
    ),
    { entity: "year", transition: "activate", id, revision },
  );
  assert.equal(
    parseAcademicTransition(
      form({ entity: "school", transition: "delete", id, revision }),
    ),
    null,
  );
});
