import "server-only";
import type { StudentStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

function fullName(person: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function dateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
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

export type StudentDirectoryRecord = {
  id: string;
  studentNumber: string;
  fullName: string;
  status: StudentStatus;
  academicYear: string | null;
  classSection: string | null;
  primaryGuardian: string | null;
};

export async function getStudentDirectory(
  schoolId: string,
  filters: { query?: string; status?: StudentStatus },
  includePrimaryGuardians = false,
): Promise<StudentDirectoryRecord[]> {
  const query = filters.query?.trim().slice(0, 100);
  const students = await getPrisma().studentProfile.findMany({
    where: {
      schoolId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { studentNumber: { contains: query } },
              { person: { firstName: { contains: query, mode: "insensitive" } } },
              { person: { middleName: { contains: query, mode: "insensitive" } } },
              { person: { lastName: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { person: { lastName: "asc" } }, { person: { firstName: "asc" } }],
    take: 250,
    include: {
      person: true,
      guardianRelationships: {
        where: includePrimaryGuardians
          ? { archivedAt: null, isPrimaryContact: true }
          : { id: { in: [] } },
        take: 1,
        include: { guardianPerson: true },
      },
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

  return students.map((student) => {
    const enrollment = student.enrollments[0];
    const placement = enrollment?.placements[0];
    const primary = student.guardianRelationships[0]?.guardianPerson;
    return {
      id: student.id,
      studentNumber: student.studentNumber,
      fullName: fullName(student.person),
      status: student.status,
      academicYear: enrollment?.academicYear.name ?? null,
      classSection: placement
        ? className(placement.academicYearClassSection)
        : null,
      primaryGuardian: primary ? fullName(primary) : null,
    };
  });
}

export type StudentRegistrationContext = {
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  classSections: Array<{ id: string; name: string }>;
};

export async function getStudentRegistrationContext(
  schoolId: string,
): Promise<StudentRegistrationContext> {
  const academicYear = await getPrisma().academicYear.findFirst({
    where: { schoolId, status: "ACTIVE", archivedAt: null },
    orderBy: { startDate: "desc" },
    include: {
      classSections: {
        where: { status: "ACTIVE" },
        orderBy: [
          { classSectionDefinition: { gradeLevel: { sequence: "asc" } } },
          { classSectionDefinition: { sequence: "asc" } },
        ],
        include: {
          classSectionDefinition: { include: { gradeLevel: true } },
        },
      },
    },
  });
  if (!academicYear) return { academicYear: null, classSections: [] };
  return {
    academicYear: {
      id: academicYear.id,
      name: academicYear.name,
      startDate: dateOnly(academicYear.startDate)!,
      endDate: dateOnly(academicYear.endDate)!,
    },
    classSections: academicYear.classSections.map((section) => ({
      id: section.id,
      name: className(section),
    })),
  };
}

export type StudentDetailRecord = {
  id: string;
  studentNumber: string;
  status: StudentStatus;
  admittedOn: string;
  inactiveOn: string | null;
  revision: string;
  person: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    fullName: string;
    birthDate: string | null;
    birthPlace: string | null;
    nationality: string | null;
    sex: "MALE" | "FEMALE" | null;
    identities: Array<{ type: "NATIONAL_ID" | "PASSPORT"; lastFour: string }>;
    account: {
      id: string;
      username: string | null;
      status: string;
      mustChangePassword: boolean;
      suspendedAt: string | null;
    } | null;
  };
  guardians: Array<{
    id: string;
    personId: string;
    fullName: string;
    relationshipType: "MOTHER" | "FATHER";
    isLegalGuardian: boolean;
    isPrimaryContact: boolean;
    phone: string | null;
    email: string | null;
    account: {
      id: string;
      username: string | null;
      status: string;
      mustChangePassword: boolean;
      suspendedAt: string | null;
    } | null;
  }>;
  enrollments: Array<{
    id: string;
    academicYear: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    enrolledOn: string;
    endedOn: string | null;
    outcome: string | null;
    placements: Array<{
      id: string;
      classSection: string;
      validFrom: string;
      validTo: string | null;
    }>;
  }>;
  lifecycleEvents: Array<{
    id: string;
    type: string;
    effectiveOn: string;
    exitReason: string | null;
    note: string | null;
  }>;
};

export async function getStudentDetail(
  schoolId: string,
  studentProfileId: string,
  options: { includeIdentities?: boolean; includeGuardians?: boolean } = {},
): Promise<StudentDetailRecord | null> {
  const student = await getPrisma().studentProfile.findFirst({
    where: { id: studentProfileId, schoolId },
    include: {
      person: {
        include: {
          identities: {
            where: options.includeIdentities ? {} : { id: { in: [] } },
          },
          accounts: {
            where: { schoolId, portal: "STUDENT", archivedAt: null },
            include: {
              user: {
                include: { memberships: { where: { schoolId }, take: 1 } },
              },
            },
          },
        },
      },
      guardianRelationships: {
        where: options.includeGuardians
          ? { archivedAt: null }
          : { id: { in: [] } },
        orderBy: [{ isPrimaryContact: "desc" }, { relationshipType: "asc" }],
        include: {
          guardianPerson: {
            include: {
              contactPoints: { where: { archivedAt: null } },
              accounts: {
                where: { schoolId, portal: "GUARDIAN", archivedAt: null },
                include: {
                  user: {
                    include: { memberships: { where: { schoolId }, take: 1 } },
                  },
                },
              },
            },
          },
        },
      },
      enrollments: {
        orderBy: { academicYear: { startDate: "desc" } },
        include: {
          academicYear: true,
          placements: {
            orderBy: { validFrom: "desc" },
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
      lifecycleEvents: { orderBy: [{ effectiveOn: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!student) return null;
  return {
    id: student.id,
    studentNumber: student.studentNumber,
    status: student.status,
    admittedOn: dateOnly(student.admittedOn)!,
    inactiveOn: dateOnly(student.inactiveOn),
    revision: student.updatedAt.toISOString(),
    person: {
      id: student.person.id,
      firstName: student.person.firstName,
      middleName: student.person.middleName,
      lastName: student.person.lastName,
      fullName: fullName(student.person),
      birthDate: dateOnly(student.person.birthDate),
      birthPlace: student.person.birthPlace,
      nationality: student.person.nationalityText,
      sex: student.person.sex,
      identities: student.person.identities.map((identity) => ({
        type: identity.type,
        lastFour: identity.lastFour,
      })),
      account: student.person.accounts[0]
        ? {
            id: student.person.accounts[0].id,
            username:
              student.person.accounts[0].user.memberships[0]?.username ?? null,
            status:
              student.person.accounts[0].user.memberships[0]?.status ??
              student.person.accounts[0].user.status,
            mustChangePassword: student.person.accounts[0].mustChangePassword,
            suspendedAt:
              student.person.accounts[0].suspendedAt?.toISOString() ?? null,
          }
        : null,
    },
    guardians: student.guardianRelationships.map((relationship) => {
      const phone = relationship.guardianPerson.contactPoints.find((point) => point.kind === "PHONE");
      const email = relationship.guardianPerson.contactPoints.find((point) => point.kind === "EMAIL");
      const account = relationship.guardianPerson.accounts[0];
      return {
        id: relationship.id,
        personId: relationship.guardianPersonId,
        fullName: fullName(relationship.guardianPerson),
        relationshipType: relationship.relationshipType,
        isLegalGuardian: relationship.isLegalGuardian,
        isPrimaryContact: relationship.isPrimaryContact,
        phone: phone?.value ?? null,
        email: email?.value ?? null,
        account: account
          ? {
              id: account.id,
              username: account.user.memberships[0]?.username ?? null,
              status:
                account.user.memberships[0]?.status ?? account.user.status,
              mustChangePassword: account.mustChangePassword,
              suspendedAt: account.suspendedAt?.toISOString() ?? null,
            }
          : null,
      };
    }),
    enrollments: student.enrollments.map((enrollment) => ({
      id: enrollment.id,
      academicYear: enrollment.academicYear.name,
      status: enrollment.status,
      enrolledOn: dateOnly(enrollment.enrolledOn)!,
      endedOn: dateOnly(enrollment.endedOn),
      outcome: enrollment.outcome,
      placements: enrollment.placements.map((placement) => ({
        id: placement.id,
        classSection: className(placement.academicYearClassSection),
        validFrom: dateOnly(placement.validFrom)!,
        validTo: dateOnly(placement.validTo),
      })),
    })),
    lifecycleEvents: student.lifecycleEvents.map((event) => ({
      id: event.id,
      type: event.type,
      effectiveOn: dateOnly(event.effectiveOn)!,
      exitReason: event.exitReason,
      note: event.note,
    })),
  };
}

export type GuardianCandidate = {
  id: string;
  fullName: string;
  role: "STUDENT" | "GUARDIAN" | "PERSON";
  studentNumber: string | null;
  childCount: number;
  contact: string | null;
};

export async function getGuardianCandidates(
  schoolId: string,
  student: StudentDetailRecord,
): Promise<GuardianCandidate[]> {
  const excluded = new Set([
    student.person.id,
    ...student.guardians.map((guardian) => guardian.personId),
  ]);
  const people = await getPrisma().person.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      id: { notIn: [...excluded] },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 250,
    include: {
      studentProfile: { select: { studentNumber: true } },
      guardianRelationships: { where: { archivedAt: null }, select: { id: true } },
      contactPoints: { where: { archivedAt: null }, take: 1 },
    },
  });
  return people.map((person) => ({
    id: person.id,
    fullName: fullName(person),
    role: person.studentProfile
      ? "STUDENT"
      : person.guardianRelationships.length
        ? "GUARDIAN"
        : "PERSON",
    studentNumber: person.studentProfile?.studentNumber ?? null,
    childCount: person.guardianRelationships.length,
    contact: person.contactPoints[0]?.value ?? null,
  }));
}
