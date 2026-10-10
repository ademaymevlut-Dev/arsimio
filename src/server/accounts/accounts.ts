import "server-only";
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

function className(section: {
  classSectionDefinition: {
    code: string;
    displayLabel: string | null;
    gradeLevel: { displayLabel: string };
  };
}) {
  return (
    section.classSectionDefinition.displayLabel ??
    `${section.classSectionDefinition.gradeLevel.displayLabel} / ${section.classSectionDefinition.code}`
  );
}

export type PersonAccountSummary = {
  id: string;
  personId: string;
  fullName: string;
  username: string | null;
  portal: string;
  status: string;
  mustChangePassword: boolean;
  suspendedAt: string | null;
};

export async function getAccountDirectory(
  schoolId: string,
): Promise<PersonAccountSummary[]> {
  const accounts = await getPrisma().personAccount.findMany({
    where: { schoolId, archivedAt: null },
    orderBy: [{ portal: "asc" }, { person: { lastName: "asc" } }],
    include: {
      person: true,
      user: {
        include: {
          memberships: {
            where: { schoolId },
            take: 1,
          },
        },
      },
    },
  });
  return accounts.map((account) => {
    const membership = account.user.memberships[0];
    return {
      id: account.id,
      personId: account.personId,
      fullName: fullName(account.person),
      username: membership?.username ?? null,
      portal: account.portal,
      status: membership?.status ?? account.user.status,
      mustChangePassword: account.mustChangePassword,
      suspendedAt: account.suspendedAt?.toISOString() ?? null,
    };
  });
}

export async function getPersonAccountForPerson(
  schoolId: string,
  personId: string,
  portal: "STUDENT" | "GUARDIAN" | "TEACHER",
) {
  const account = await getPrisma().personAccount.findFirst({
    where: { schoolId, personId, portal, archivedAt: null },
    include: {
      user: {
        include: { memberships: { where: { schoolId }, take: 1 } },
      },
    },
  });
  if (!account) return null;
  const membership = account.user.memberships[0];
  return {
    id: account.id,
    username: membership?.username ?? null,
    status: membership?.status ?? account.user.status,
    mustChangePassword: account.mustChangePassword,
    suspendedAt: account.suspendedAt?.toISOString() ?? null,
  };
}

export type GuardianDirectoryRecord = {
  personId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  childCount: number;
  primaryChildCount: number;
  account: Awaited<ReturnType<typeof getPersonAccountForPerson>>;
};

export type GuardianDetailRecord = {
  personId: string;
  revision: string;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  occupation: string | null;
  phone: string | null;
  email: string | null;
  account: Awaited<ReturnType<typeof getPersonAccountForPerson>>;
  children: Array<{
    relationshipId: string;
    studentProfileId: string;
    studentNumber: string;
    fullName: string;
    relationshipType: string;
    isPrimaryContact: boolean;
    isFinancialResponsible: boolean;
    isLegalGuardian: boolean;
    classSection: string | null;
    academicYear: string | null;
  }>;
};

export async function getGuardianDirectory(
  schoolId: string,
): Promise<GuardianDirectoryRecord[]> {
  const guardians = await getPrisma().person.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      guardianRelationships: { some: { schoolId, archivedAt: null } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      contactPoints: { where: { archivedAt: null } },
      guardianRelationships: {
        where: { schoolId, archivedAt: null },
        select: { id: true, isPrimaryContact: true },
      },
      accounts: {
        where: { schoolId, portal: "GUARDIAN", archivedAt: null },
        include: { user: { include: { memberships: { where: { schoolId } } } } },
      },
    },
  });
  return guardians.map((guardian) => {
    const phone = guardian.contactPoints.find((point) => point.kind === "PHONE");
    const email = guardian.contactPoints.find((point) => point.kind === "EMAIL");
    const account = guardian.accounts[0];
    const membership = account?.user.memberships[0];
    return {
      personId: guardian.id,
      fullName: fullName(guardian),
      phone: phone?.value ?? null,
      email: email?.value ?? null,
      childCount: guardian.guardianRelationships.length,
      primaryChildCount: guardian.guardianRelationships.filter(
        (relationship) => relationship.isPrimaryContact,
      ).length,
      account: account
        ? {
            id: account.id,
            username: membership?.username ?? null,
            status: membership?.status ?? account.user.status,
            mustChangePassword: account.mustChangePassword,
            suspendedAt: account.suspendedAt?.toISOString() ?? null,
          }
        : null,
    };
  });
}

export async function getGuardianDetail(
  schoolId: string,
  personId: string,
): Promise<GuardianDetailRecord | null> {
  const guardian = await getPrisma().person.findFirst({
    where: { id: personId, schoolId, status: "ACTIVE" },
    include: {
      contactPoints: { where: { archivedAt: null } },
      accounts: {
        where: { schoolId, portal: "GUARDIAN", archivedAt: null },
        include: { user: { include: { memberships: { where: { schoolId } } } } },
      },
      guardianRelationships: {
        where: { schoolId, archivedAt: null },
        include: {
          student: {
            include: {
              person: true,
              enrollments: {
                orderBy: { academicYear: { startDate: "desc" } },
                take: 1,
                include: {
                  academicYear: true,
                  placements: {
                    orderBy: { validFrom: "desc" },
                    take: 1,
                    include: {
                      academicYearClassSection: {
                        include: {
                          classSectionDefinition: {
                            include: { gradeLevel: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!guardian || guardian.guardianRelationships.length === 0) return null;
  const phone = guardian.contactPoints.find((point) => point.kind === "PHONE");
  const email = guardian.contactPoints.find((point) => point.kind === "EMAIL");
  const account = guardian.accounts[0];
  const membership = account?.user.memberships[0];
  return {
    personId: guardian.id,
    revision: guardian.updatedAt.toISOString(),
    fullName: fullName(guardian),
    firstName: guardian.firstName,
    middleName: guardian.middleName,
    lastName: guardian.lastName,
    occupation: guardian.occupationText,
    phone: phone?.value ?? null,
    email: email?.value ?? null,
    account: account
      ? {
          id: account.id,
          username: membership?.username ?? null,
          status: membership?.status ?? account.user.status,
          mustChangePassword: account.mustChangePassword,
          suspendedAt: account.suspendedAt?.toISOString() ?? null,
        }
      : null,
    children: guardian.guardianRelationships.map((relationship) => {
      const enrollment = relationship.student.enrollments[0];
      const placement = enrollment?.placements[0];
      return {
        relationshipId: relationship.id,
        studentProfileId: relationship.student.id,
        studentNumber: relationship.student.studentNumber,
        fullName: fullName(relationship.student.person),
        relationshipType: relationship.relationshipType,
        isPrimaryContact: relationship.isPrimaryContact,
        isFinancialResponsible: relationship.isFinancialResponsible,
        isLegalGuardian: relationship.isLegalGuardian,
        classSection: placement
          ? className(placement.academicYearClassSection)
          : null,
        academicYear: enrollment?.academicYear.name ?? null,
      };
    }),
  };
}

export async function getGuardianPortalHome(schoolId: string, personId: string) {
  const detail = await getGuardianDetail(schoolId, personId);
  return detail
    ? {
        fullName: detail.fullName,
        children: detail.children,
      }
    : null;
}

export async function getStudentPortalHome(schoolId: string, personId: string) {
  const student = await getPrisma().studentProfile.findFirst({
    where: { schoolId, personId },
    include: {
      person: true,
      enrollments: {
        orderBy: { academicYear: { startDate: "desc" } },
        take: 1,
        include: {
          academicYear: true,
          placements: {
            orderBy: { validFrom: "desc" },
            take: 1,
            include: {
              academicYearClassSection: {
                include: {
                  classSectionDefinition: { include: { gradeLevel: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!student) return null;
  const enrollment = student.enrollments[0];
  const placement = enrollment?.placements[0];
  return {
    fullName: fullName(student.person),
    studentNumber: student.studentNumber,
    status: student.status,
    academicYear: enrollment?.academicYear.name ?? null,
    classSection: placement
      ? className(placement.academicYearClassSection)
      : null,
  };
}
