import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyHostname,
  domainIsUsable,
  normalizeHostname,
} from "../src/server/tenancy/hostname";
import {
  canAccessSchool,
  type SchoolAccessInput,
} from "../src/server/authorization/policy";

for (const bad of [
  null,
  "",
  " arsimio.vercel.app",
  "https://arsimio.vercel.app",
  "arsimio.vercel.app@evil.test",
  "arsimio.vercel.app,evil.test",
  "evil.test/arsimio.vercel.app",
  "foo\\bar.test",
  "foo..test",
  "-foo.test",
  "foo-.test",
  "foo.test:0",
  "foo.test:65536",
  "foo.test:abc",
  "foo.test?x=1",
  "foo%2etest",
  "a".repeat(64) + ".test",
]) {
  test(`reject malformed host ${JSON.stringify(bad)}`, () =>
    assert.equal(normalizeHostname(bad), null));
}
test("hostname normalization", () => {
  assert.equal(
    normalizeHostname("HorizonEdu.Vercel.App:443"),
    "horizonedu.vercel.app",
  );
  assert.equal(
    normalizeHostname("horizonedu.vercel.app."),
    "horizonedu.vercel.app",
  );
});
test("only exact platform hostname grants platform context", () => {
  assert.equal(classifyHostname("arsimio.vercel.app").kind, "platform");
  for (const host of [
    "arsimio.vercel.app.evil.test",
    "evil-arsimio.vercel.app",
    "horizonedu.vercel.app",
    "localhost",
  ])
    assert.equal(classifyHostname(host).kind, "school");
});
test("development aliases are never production aliases", () => {
  assert.equal(classifyHostname("localhost", true).kind, "platform");
  assert.equal(
    classifyHostname("horizonedu.localhost", true).hostname,
    "horizonedu.vercel.app",
  );
  assert.equal(
    classifyHostname("horizonedu.localhost", false).hostname,
    "horizonedu.localhost",
  );
});
const domain = {
  status: "VERIFIED",
  verifiedAt: new Date(),
  school: { status: "ACTIVE", archivedAt: null },
};
test("only verified active domains and schools resolve", () => {
  assert.equal(domainIsUsable(domain), true);
  assert.equal(domainIsUsable(null), false);
  assert.equal(domainIsUsable({ ...domain, verifiedAt: null }), false);
  for (const status of ["PENDING", "DISABLED", "FAILED"])
    assert.equal(domainIsUsable({ ...domain, status }), false);
  for (const status of ["DRAFT", "SUSPENDED", "ARCHIVED"])
    assert.equal(
      domainIsUsable({ ...domain, school: { status, archivedAt: null } }),
      false,
    );
  assert.equal(
    domainIsUsable({
      ...domain,
      school: { status: "ACTIVE", archivedAt: new Date() },
    }),
    false,
  );
});
const access: SchoolAccessInput = {
  userStatus: "ACTIVE",
  schoolStatus: "ACTIVE",
  membershipStatus: "ACTIVE",
  membershipSchoolId: "a",
  tenantSchoolId: "a",
  resourceSchoolId: "a",
  permissions: ["dashboard.read", "school.settings.update"],
};
test("active same-school grant works", () =>
  assert.equal(canAccessSchool(access, "school.settings.update"), true));
for (const field of [
  "membershipSchoolId",
  "resourceSchoolId",
  "tenantSchoolId",
] as const) {
  test(`cross-school ${field} rejected`, () =>
    assert.equal(
      canAccessSchool({ ...access, [field]: "b" }, "dashboard.read"),
      false,
    ));
}
for (const field of [
  "userStatus",
  "schoolStatus",
  "membershipStatus",
] as const) {
  test(`suspended ${field} rejected`, () =>
    assert.equal(
      canAccessSchool({ ...access, [field]: "SUSPENDED" }, "dashboard.read"),
      false,
    ));
}
test("a teacher's dashboard grant cannot update settings", () =>
  assert.equal(
    canAccessSchool(
      { ...access, permissions: ["dashboard.read"] },
      "school.settings.update",
    ),
    false,
  ));
test("platform privileges are not school privileges", () =>
  assert.equal(
    canAccessSchool(
      { ...access, permissions: ["platform.schools.update"] },
      "school.settings.update",
    ),
    false,
  ));
