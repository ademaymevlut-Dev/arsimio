import "server-only";
import type { EmploymentStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function translatedName(
  item: { defaultName?: string; name?: string; translations?: { name: string }[] },
) {
  return item.translations?.[0]?.name ?? item.defaultName ?? item.name ?? "—";
}

function contact(
  points: { kind: string; value: string; isPrimaryForPerson: boolean }[],
  kind: "PHONE" | "EMAIL",
) {
  return (
    points.find((point) => point.kind === kind && point.isPrimaryForPerson)
      ?.value ??
    points.find((point) => point.kind === kind)?.value ??
    null
  );
}

export type StaffDirectoryFilter = {
  query?: string;
  status?: EmploymentStatus;
};

export async function getStaffRegistrationContext(
  schoolId: string,
  locale: string,
) {
  const db = getPrisma();
  const [departments, positions, people] = await Promise.all([
    db.staffDepartment.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: [{ defaultName: "asc" }],
      include: { translations: { where: { locale }, take: 1 } },
    }),
    db.staffPosition.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: [{ defaultName: "asc" }],
      include: { translations: { where: { locale }, take: 1 } },
    }),
    db.person.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        archivedAt: null,
        employments: {
          none: {
            schoolId,
            archivedAt: null,
            status: { in: ["ACTIVE", "ON_LEAVE"] },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
      include: {
        studentProfile: { select: { studentNumber: true } },
        guardianRelationships: {
          where: { schoolId, archivedAt: null },
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    departments: departments.map((department) => ({
      id: department.id,
      name: translatedName(department),
      code: department.code,
    })),
    positions: positions.map((position) => ({
      id: position.id,
      name: translatedName(position),
      code: position.code,
    })),
    people: people.map((person) => ({
      id: person.id,
      fullName: fullName(person),
      hint: [
        person.studentProfile ? `Ogrenci no ${person.studentProfile.studentNumber}` : null,
        person.guardianRelationships.length ? "Veli" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

export async function getStaffDirectory(
  schoolId: string,
  locale: string,
  filter: StaffDirectoryFilter = {},
) {
  const query = filter.query?.trim();
  const rows = await getPrisma().employment.findMany({
    where: {
      schoolId,
      archivedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(query
        ? {
            OR: [
              { staffNumber: { contains: query, mode: "insensitive" } },
              { person: { firstName: { contains: query, mode: "insensitive" } } },
              { person: { lastName: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { staffNumber: "asc" }],
    include: {
      person: true,
      department: { include: { translations: { where: { locale }, take: 1 } } },
      position: { include: { translations: { where: { locale }, take: 1 } } },
      teacherProfile: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    staffNumber: row.staffNumber,
    fullName: fullName(row.person),
    status: row.status,
    type: row.type,
    hiredOn: row.hiredOn.toISOString().slice(0, 10),
    department: translatedName(row.department),
    position: translatedName(row.position),
    isTeacher: Boolean(row.teacherProfile && !row.teacherProfile.archivedAt),
    teacherTitle:
      row.teacherProfile && !row.teacherProfile.archivedAt
        ? row.teacherProfile.title
        : null,
  }));
}

export async function getStaffDetail(
  schoolId: string,
  employmentId: string,
  locale: string,
) {
  const db = getPrisma();
  const employment = await db.employment.findFirst({
    where: { id: employmentId, schoolId, archivedAt: null },
    include: {
      person: {
        include: {
          contactPoints: { where: { archivedAt: null } },
          accounts: {
            where: { schoolId, portal: "TEACHER", archivedAt: null },
            include: { user: { include: { memberships: { where: { schoolId } } } } },
          },
        },
      },
      department: { include: { translations: { where: { locale }, take: 1 } } },
      position: { include: { translations: { where: { locale }, take: 1 } } },
      lifecycleEvents: { orderBy: [{ effectiveOn: "desc" }, { createdAt: "desc" }] },
      teacherProfile: {
        include: {
          capabilities: {
            include: {
              subject: {
                include: { translations: { where: { locale }, take: 1 } },
              },
            },
          },
        },
      },
    },
  });
  if (!employment) return null;
  const subjects = await db.subject.findMany({
    where: { schoolId, archivedAt: null },
    orderBy: [{ name: "asc" }],
    include: { translations: { where: { locale }, take: 1 } },
  });
  const account = employment.person.accounts[0];
  const membership = account?.user.memberships[0];
  const teacherProfile = employment.teacherProfile?.archivedAt
    ? null
    : employment.teacherProfile;
  return {
    id: employment.id,
    revision: employment.updatedAt.toISOString(),
    staffNumber: employment.staffNumber,
    status: employment.status,
    type: employment.type,
    hiredOn: employment.hiredOn.toISOString().slice(0, 10),
    endedOn: employment.endedOn?.toISOString().slice(0, 10) ?? null,
    exitReason: employment.exitReason,
    note: employment.note,
    personId: employment.personId,
    fullName: fullName(employment.person),
    firstName: employment.person.firstName,
    lastName: employment.person.lastName,
    phone: contact(employment.person.contactPoints, "PHONE"),
    email: contact(employment.person.contactPoints, "EMAIL"),
    department: translatedName(employment.department),
    position: translatedName(employment.position),
    teacherProfile: teacherProfile
      ? {
          id: teacherProfile.id,
          category: teacherProfile.category,
          title: teacherProfile.title,
          status: teacherProfile.status,
          note: teacherProfile.note,
          subjectIds: teacherProfile.capabilities.map(
            (capability) => capability.subjectId,
          ),
          subjects: teacherProfile.capabilities.map((capability) => ({
            id: capability.subjectId,
            name: translatedName(capability.subject),
          })),
        }
      : null,
    teacherAccount: account
      ? {
          id: account.id,
          username: membership?.username ?? null,
          status: membership?.status ?? account.user.status,
          mustChangePassword: account.mustChangePassword,
          suspendedAt: account.suspendedAt?.toISOString() ?? null,
        }
      : null,
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: translatedName(subject),
      track: subject.track,
    })),
    lifecycleEvents: employment.lifecycleEvents.map((event) => ({
      id: event.id,
      type: event.type,
      effectiveOn: event.effectiveOn.toISOString().slice(0, 10),
      exitReason: event.exitReason,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getTeacherDirectory(schoolId: string, locale: string) {
  const profiles = await getPrisma().teacherProfile.findMany({
    where: { schoolId, archivedAt: null },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: {
      employment: {
        include: {
          person: true,
          department: { include: { translations: { where: { locale }, take: 1 } } },
          position: { include: { translations: { where: { locale }, take: 1 } } },
        },
      },
      capabilities: {
        include: {
          subject: { include: { translations: { where: { locale }, take: 1 } } },
        },
      },
    },
  });
  return profiles.map((profile) => ({
    id: profile.id,
    employmentId: profile.employmentId,
    staffNumber: profile.employment.staffNumber,
    fullName: fullName(profile.employment.person),
    title: profile.title,
    category: profile.category,
    status: profile.status,
    employmentStatus: profile.employment.status,
    department: translatedName(profile.employment.department),
    position: translatedName(profile.employment.position),
    subjects: profile.capabilities.map((capability) =>
      translatedName(capability.subject),
    ),
  }));
}

export async function getTeacherPortalHome(schoolId: string, personId: string) {
  const profile = await getPrisma().teacherProfile.findFirst({
    where: {
      schoolId,
      archivedAt: null,
      employment: {
        schoolId,
        personId,
        archivedAt: null,
        status: { in: ["ACTIVE", "ON_LEAVE"] },
      },
    },
    include: {
      employment: { include: { person: true } },
      capabilities: { include: { subject: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!profile) return null;
  return {
    fullName: fullName(profile.employment.person),
    staffNumber: profile.employment.staffNumber,
    title: profile.title,
    category: profile.category,
    status: profile.status,
    employmentStatus: profile.employment.status,
    subjects: profile.capabilities.map((capability) => capability.subject.name),
  };
}
