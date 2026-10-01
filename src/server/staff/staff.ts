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

function translatedTitle(item: {
  title: string;
  translations?: { title: string }[];
}) {
  return item.translations?.[0]?.title ?? item.title;
}

function titleTranslations(item: {
  title: string;
  translations?: { locale: string; title: string }[];
}) {
  const values = Object.fromEntries(
    item.translations?.map((translation) => [
      translation.locale,
      translation.title,
    ]) ?? [],
  );
  return {
    tr: values.tr ?? item.title,
    sq: values.sq ?? item.title,
    en: values.en ?? item.title,
  };
}

function catalogTranslations(item: {
  defaultName: string;
  translations?: { locale: string; name: string }[];
}) {
  const values = Object.fromEntries(
    item.translations?.map((translation) => [
      translation.locale,
      translation.name,
    ]) ?? [],
  );
  return {
    tr: values.tr ?? item.defaultName,
    sq: values.sq ?? item.defaultName,
    en: values.en ?? item.defaultName,
  };
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

export type StaffCatalogItem = {
  id: string;
  code: string;
  name: string;
  names: { tr: string; sq: string; en: string };
  archived: boolean;
  revision: string;
  employmentCount: number;
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
      studentNumber: person.studentProfile?.studentNumber ?? null,
      isGuardian: person.guardianRelationships.length > 0,
    })),
  };
}

export async function getStaffCatalogs(schoolId: string, locale: string) {
  const db = getPrisma();
  const [departments, positions] = await Promise.all([
    db.staffDepartment.findMany({
      where: { schoolId },
      orderBy: [{ archivedAt: "asc" }, { defaultName: "asc" }],
      include: {
        translations: true,
        _count: { select: { employments: true } },
      },
    }),
    db.staffPosition.findMany({
      where: { schoolId },
      orderBy: [{ archivedAt: "asc" }, { defaultName: "asc" }],
      include: {
        translations: true,
        _count: { select: { employments: true } },
      },
    }),
  ]);
  const toCatalogItem = (item: {
    id: string;
    code: string;
    defaultName: string;
    archivedAt: Date | null;
    updatedAt: Date;
    translations: { locale: string; name: string }[];
    _count: { employments: number };
  }): StaffCatalogItem => {
    const names = catalogTranslations(item);
    return {
      id: item.id,
      code: item.code,
      name: names[locale as keyof typeof names] ?? item.defaultName,
      names,
      archived: Boolean(item.archivedAt),
      revision: item.updatedAt.toISOString(),
      employmentCount: item._count.employments,
    };
  };

  const byStatusAndName = (first: StaffCatalogItem, second: StaffCatalogItem) =>
    Number(first.archived) - Number(second.archived) ||
    first.name.localeCompare(second.name, locale);

  return {
    departments: departments.map(toCatalogItem).sort(byStatusAndName),
    positions: positions.map(toCatalogItem).sort(byStatusAndName),
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
      teacherProfile: {
        include: { translations: { where: { locale }, take: 1 } },
      },
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
        ? translatedTitle(row.teacherProfile)
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
          translations: true,
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
          title: translatedTitle(teacherProfile),
          titleTranslations: titleTranslations(teacherProfile),
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
      translations: { where: { locale }, take: 1 },
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
    title: translatedTitle(profile),
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

export async function getTeacherPortalHome(
  schoolId: string,
  personId: string,
  locale: string,
) {
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
      translations: { where: { locale }, take: 1 },
      capabilities: {
        include: {
          subject: { include: { translations: { where: { locale }, take: 1 } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!profile) return null;
  return {
    fullName: fullName(profile.employment.person),
    staffNumber: profile.employment.staffNumber,
    title: translatedTitle(profile),
    category: profile.category,
    status: profile.status,
    employmentStatus: profile.employment.status,
    subjects: profile.capabilities.map((capability) =>
      translatedName(capability.subject),
    ),
  };
}
