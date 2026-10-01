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

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function classSectionLabel(section: {
  classSectionDefinition: {
    code: string;
    displayLabel: string | null;
    gradeLevel: { displayLabel: string; sequence: number };
  };
}) {
  return (
    section.classSectionDefinition.displayLabel ??
    `${section.classSectionDefinition.gradeLevel.displayLabel}/${section.classSectionDefinition.code}`
  );
}

function assignmentTeacherName(assignment: {
  teacherProfile: {
    employment: {
      person: {
        firstName: string;
        middleName?: string | null;
        lastName: string;
      };
    };
  };
}) {
  return fullName(assignment.teacherProfile.employment.person);
}

export async function getTeacherDetail(
  schoolId: string,
  teacherProfileId: string,
  locale: string,
) {
  const db = getPrisma();
  const [profile, activeYear] = await Promise.all([
    db.teacherProfile.findFirst({
      where: { id: teacherProfileId, schoolId, archivedAt: null },
      include: {
        translations: { where: { locale }, take: 1 },
        employment: {
          include: {
            person: {
              include: {
                contactPoints: { where: { archivedAt: null } },
                accounts: {
                  where: { schoolId, portal: "TEACHER", archivedAt: null },
                  include: {
                    user: {
                      include: { memberships: { where: { schoolId } } },
                    },
                  },
                },
              },
            },
            department: {
              include: { translations: { where: { locale }, take: 1 } },
            },
            position: {
              include: { translations: { where: { locale }, take: 1 } },
            },
          },
        },
        capabilities: {
          include: {
            subject: { include: { translations: { where: { locale }, take: 1 } } },
          },
        },
      },
    }),
    db.academicYear.findFirst({
      where: { schoolId, status: "ACTIVE", archivedAt: null },
      orderBy: [{ startDate: "desc" }],
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!profile) return null;

  const account = profile.employment.person.accounts[0];
  const membership = account?.user.memberships[0];
  const [
    classSections,
    courseOfferings,
    homeroomAssignments,
    courseAssignments,
  ] = activeYear
    ? await Promise.all([
        db.academicYearClassSection.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            status: "ACTIVE",
          },
          include: {
            classSectionDefinition: {
              include: { gradeLevel: true },
            },
            homeroomTeacherAssignments: {
              where: { status: "ACTIVE", archivedAt: null },
              take: 1,
              include: {
                teacherProfile: {
                  include: { employment: { include: { person: true } } },
                },
              },
            },
          },
        }),
        db.courseOffering.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            archivedAt: null,
            academicYearClassSection: { status: "ACTIVE" },
          },
          include: {
            subject: { include: { translations: { where: { locale }, take: 1 } } },
            academicYearClassSection: {
              include: {
                classSectionDefinition: { include: { gradeLevel: true } },
              },
            },
            teacherAssignments: {
              where: { status: "ACTIVE", archivedAt: null },
              take: 1,
              include: {
                teacherProfile: {
                  include: { employment: { include: { person: true } } },
                },
              },
            },
          },
        }),
        db.homeroomTeacherAssignment.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            teacherProfileId: profile.id,
            archivedAt: null,
          },
          orderBy: [{ status: "asc" }, { effectiveFrom: "desc" }],
          include: {
            academicYearClassSection: {
              include: {
                classSectionDefinition: { include: { gradeLevel: true } },
              },
            },
          },
        }),
        db.courseTeacherAssignment.findMany({
          where: {
            schoolId,
            academicYearId: activeYear.id,
            teacherProfileId: profile.id,
            archivedAt: null,
          },
          orderBy: [{ status: "asc" }, { effectiveFrom: "desc" }],
          include: {
            courseOffering: {
              include: {
                subject: {
                  include: { translations: { where: { locale }, take: 1 } },
                },
                academicYearClassSection: {
                  include: {
                    classSectionDefinition: { include: { gradeLevel: true } },
                  },
                },
              },
            },
          },
        }),
      ])
    : [[], [], [], []] as const;

  const sortedClassSections = [...classSections].sort((first, second) => {
    const firstGrade =
      first.classSectionDefinition.gradeLevel.sequence -
      second.classSectionDefinition.gradeLevel.sequence;
    if (firstGrade !== 0) return firstGrade;
    return classSectionLabel(first).localeCompare(
      classSectionLabel(second),
      locale,
    );
  });
  const sortedCourseOfferings = [...courseOfferings].sort((first, second) => {
    const firstClass = classSectionLabel(first.academicYearClassSection);
    const secondClass = classSectionLabel(second.academicYearClassSection);
    return (
      firstClass.localeCompare(secondClass, locale) ||
      translatedName(first.subject).localeCompare(
        translatedName(second.subject),
        locale,
      )
    );
  });

  return {
    id: profile.id,
    employmentId: profile.employmentId,
    personId: profile.employment.personId,
    staffNumber: profile.employment.staffNumber,
    fullName: fullName(profile.employment.person),
    title: translatedTitle(profile),
    category: profile.category,
    status: profile.status,
    employmentStatus: profile.employment.status,
    department: translatedName(profile.employment.department),
    position: translatedName(profile.employment.position),
    phone: contact(profile.employment.person.contactPoints, "PHONE"),
    email: contact(profile.employment.person.contactPoints, "EMAIL"),
    subjects: profile.capabilities.map((capability) => ({
      id: capability.subjectId,
      name: translatedName(capability.subject),
    })),
    teacherAccount: account
      ? {
          id: account.id,
          username: membership?.username ?? null,
          status: membership?.status ?? account.user.status,
          mustChangePassword: account.mustChangePassword,
          suspendedAt: account.suspendedAt?.toISOString() ?? null,
        }
      : null,
    activeYear: activeYear
      ? {
          id: activeYear.id,
          name: activeYear.name,
          startDate: dateValue(activeYear.startDate),
          endDate: dateValue(activeYear.endDate),
        }
      : null,
    classSections: sortedClassSections.map((section) => {
      const activeAssignment = section.homeroomTeacherAssignments[0];
      return {
        id: section.id,
        label: classSectionLabel(section),
        activeTeacherProfileId:
          activeAssignment?.teacherProfileId ?? null,
        activeTeacherName: activeAssignment
          ? assignmentTeacherName(activeAssignment)
          : null,
      };
    }),
    courseOfferings: sortedCourseOfferings.map((offering) => {
      const classLabel = classSectionLabel(offering.academicYearClassSection);
      const subjectName = translatedName(offering.subject);
      const activeAssignment = offering.teacherAssignments[0];
      return {
        id: offering.id,
        label: `${classLabel} · ${subjectName}`,
        classLabel,
        subjectName,
        track: offering.subject.track,
        activeTeacherProfileId:
          activeAssignment?.teacherProfileId ?? null,
        activeTeacherName: activeAssignment
          ? assignmentTeacherName(activeAssignment)
          : null,
      };
    }),
    homeroomAssignments: homeroomAssignments.map((assignment) => ({
      id: assignment.id,
      revision: assignment.updatedAt.toISOString(),
      status: assignment.status,
      classLabel: classSectionLabel(assignment.academicYearClassSection),
      effectiveFrom: dateValue(assignment.effectiveFrom),
      effectiveTo: assignment.effectiveTo
        ? dateValue(assignment.effectiveTo)
        : null,
      note: assignment.note,
    })),
    courseAssignments: courseAssignments.map((assignment) => ({
      id: assignment.id,
      revision: assignment.updatedAt.toISOString(),
      status: assignment.status,
      courseOfferingId: assignment.courseOfferingId,
      classLabel: classSectionLabel(
        assignment.courseOffering.academicYearClassSection,
      ),
      subjectName: translatedName(assignment.courseOffering.subject),
      track: assignment.courseOffering.subject.track,
      effectiveFrom: dateValue(assignment.effectiveFrom),
      effectiveTo: assignment.effectiveTo
        ? dateValue(assignment.effectiveTo)
        : null,
      note: assignment.note,
    })),
  };
}
