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

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeValue(date: Date) {
  return date.toISOString().slice(11, 16);
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

function schedulePeriodLabel(period: {
  defaultName: string;
  translations?: { name: string }[];
  startTime: Date;
  endTime: Date;
}) {
  const name = period.translations?.[0]?.name ?? period.defaultName;
  return `${name} (${timeValue(period.startTime)}–${timeValue(period.endTime)})`;
}

const WEEKDAY_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

const WEEKDAY_ORDER = new Map([
  ["MONDAY", 1],
  ["TUESDAY", 2],
  ["WEDNESDAY", 3],
  ["THURSDAY", 4],
  ["FRIDAY", 5],
]);

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
  includeContracts = false,
  includeCompensations = false,
) {
  const db = getPrisma();
  const employment = await db.employment.findFirst({
    where: { id: employmentId, schoolId, archivedAt: null },
    include: {
      person: {
        include: {
          contactPoints: { where: { archivedAt: null } },
          identities: true,
          accounts: {
            where: { schoolId, portal: "TEACHER", archivedAt: null },
            include: { user: { include: { memberships: { where: { schoolId } } } } },
          },
        },
      },
      department: { include: { translations: { where: { locale }, take: 1 } } },
      position: { include: { translations: { where: { locale }, take: 1 } } },
      hrProfile: true,
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
  const contracts = includeContracts
    ? await db.employmentContract.findMany({
        where: { schoolId, employmentId: employment.id },
        orderBy: [{ status: "asc" }, { startedOn: "desc" }, { createdAt: "desc" }],
      })
    : [];
  const compensations = includeCompensations
    ? await db.employmentCompensation.findMany({
        where: { schoolId, employmentId: employment.id },
        orderBy: [{ status: "asc" }, { startedOn: "desc" }, { createdAt: "desc" }],
      })
    : [];
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
    photoUrl: employment.person.photoUrl,
    photoUpdatedAt: employment.person.photoUpdatedAt?.toISOString() ?? null,
    identities: employment.person.identities.map((identity) => ({
      id: identity.id,
      type: identity.type,
      countryCode: identity.countryCode,
      lastFour: identity.lastFour,
    })),
    hrProfile: employment.hrProfile
      ? {
          residenceCity: employment.hrProfile.residenceCity,
          neighborhood: employment.hrProfile.neighborhood,
          addressLine: employment.hrProfile.addressLine,
          emergencyContactName: employment.hrProfile.emergencyContactName,
          emergencyContactRelation: employment.hrProfile.emergencyContactRelation,
          emergencyContactPhone: employment.hrProfile.emergencyContactPhone,
          internalNote: employment.hrProfile.internalNote,
        }
      : null,
    contracts: contracts.map((contract) => ({
      id: contract.id,
      contractNumber: contract.contractNumber,
      type: contract.type,
      status: contract.status,
      startedOn: dateValue(contract.startedOn),
      endedOn: contract.endedOn ? dateValue(contract.endedOn) : null,
      note: contract.note,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
      revision: contract.updatedAt.toISOString(),
    })),
    compensations: compensations.map((compensation) => ({
      id: compensation.id,
      amount: compensation.amount.toString(),
      currencyCode: compensation.currencyCode,
      amountKind: compensation.amountKind,
      payType: compensation.payType,
      status: compensation.status,
      startedOn: dateValue(compensation.startedOn),
      endedOn: compensation.endedOn ? dateValue(compensation.endedOn) : null,
      note: compensation.note,
      createdAt: compensation.createdAt.toISOString(),
      updatedAt: compensation.updatedAt.toISOString(),
      revision: compensation.updatedAt.toISOString(),
    })),
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
  const db = getPrisma();
  const [profile, activeYear] = await Promise.all([
    db.teacherProfile.findFirst({
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
            subject: {
              include: { translations: { where: { locale }, take: 1 } },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.academicYear.findFirst({
      where: { schoolId, status: "ACTIVE", archivedAt: null },
      orderBy: [{ startDate: "desc" }],
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        academicWeeks: {
          orderBy: [{ sequence: "asc" }, { startDate: "asc" }],
          select: {
            id: true,
            sequence: true,
            startDate: true,
            endDate: true,
            instructionalDayCount: true,
            calendarDays: {
              orderBy: { date: "asc" },
              select: {
                id: true,
                date: true,
                weekday: true,
                isInstructionalDay: true,
              },
            },
          },
        },
      },
    }),
  ]);
  if (!profile) return null;
  const timetableSessions = activeYear
    ? await db.timetableSession.findMany({
        where: {
          schoolId,
          academicYearId: activeYear.id,
          teacherProfileId: profile.id,
          status: "ACTIVE",
          archivedAt: null,
        },
        include: {
          schedulePeriod: {
            include: { translations: { where: { locale }, take: 1 } },
          },
          participants: {
            where: { status: "ACTIVE", archivedAt: null },
            include: {
              lessonTopicEntries: {
                select: {
                  id: true,
                  academicCalendarDayId: true,
                  content: true,
                  updatedAt: true,
                },
              },
              homeworkEntries: {
                select: {
                  id: true,
                  academicCalendarDayId: true,
                  title: true,
                  content: true,
                  updatedAt: true,
                },
              },
              examNotificationEntries: {
                select: {
                  id: true,
                  academicCalendarDayId: true,
                  content: true,
                  updatedAt: true,
                },
              },
              commentEntries: {
                select: {
                  id: true,
                  academicCalendarDayId: true,
                  studentProfileId: true,
                  category: true,
                  point: true,
                  content: true,
                  updatedAt: true,
                },
              },
              courseOffering: {
                include: {
                  subject: {
                    include: {
                      translations: { where: { locale }, take: 1 },
                    },
                  },
                  academicYearClassSection: {
                    include: {
                      classSectionDefinition: {
                        include: { gradeLevel: true },
                      },
                      studentGroupPlacements: {
                        where: {
                          enrollment: {
                            status: "ACTIVE",
                            student: {
                              status: "ACTIVE",
                              person: {
                                status: "ACTIVE",
                                archivedAt: null,
                              },
                            },
                          },
                        },
                        include: {
                          enrollment: {
                            include: {
                              student: {
                                include: { person: true },
                              },
                            },
                          },
                        },
                      },
                      attendanceRecords: {
                        where: {
                          schoolId,
                          academicYearId: activeYear.id,
                        },
                        include: {
                          openedTeacherProfile: {
                            include: {
                              employment: { include: { person: true } },
                            },
                          },
                          lateTeacherProfile: {
                            include: {
                              employment: { include: { person: true } },
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
      })
    : [];
  const schedulePeriodsById = new Map<
    string,
    {
      id: string;
      label: string;
      sequence: number;
      startTime: string;
      endTime: string;
    }
  >();
  for (const session of timetableSessions) {
    schedulePeriodsById.set(session.schedulePeriod.id, {
      id: session.schedulePeriod.id,
      label: schedulePeriodLabel(session.schedulePeriod),
      sequence: session.schedulePeriod.sequence,
      startTime: timeValue(session.schedulePeriod.startTime),
      endTime: timeValue(session.schedulePeriod.endTime),
    });
  }
  const schedulePeriods = [...schedulePeriodsById.values()].sort(
    (first, second) =>
      first.sequence - second.sequence ||
      first.startTime.localeCompare(second.startTime) ||
      first.label.localeCompare(second.label, locale),
  );
  const sortedSessions = [...timetableSessions].sort((first, second) => {
    const weekday =
      (WEEKDAY_ORDER.get(first.weekday) ?? 99) -
      (WEEKDAY_ORDER.get(second.weekday) ?? 99);
    if (weekday !== 0) return weekday;
    return (
      first.schedulePeriod.sequence - second.schedulePeriod.sequence ||
      timeValue(first.schedulePeriod.startTime).localeCompare(
        timeValue(second.schedulePeriod.startTime),
      )
    );
  });
  return {
    id: profile.id,
    fullName: fullName(profile.employment.person),
    staffNumber: profile.employment.staffNumber,
    title: translatedTitle(profile),
    category: profile.category,
    status: profile.status,
    employmentStatus: profile.employment.status,
    subjects: profile.capabilities.map((capability) =>
      translatedName(capability.subject),
    ),
    activeYear: activeYear
      ? {
          id: activeYear.id,
          name: activeYear.name,
          startDate: dateValue(activeYear.startDate),
          endDate: dateValue(activeYear.endDate),
        }
      : null,
    weeklySchedule: {
      weekdays: [...WEEKDAY_VALUES],
      periods: schedulePeriods,
      sessions: sortedSessions.map((session) => ({
        id: session.id,
        weekday: session.weekday,
        schedulePeriodId: session.schedulePeriodId,
        periodLabel: schedulePeriodLabel(session.schedulePeriod),
        effectiveFrom: dateValue(session.effectiveFrom),
        effectiveTo: session.effectiveTo ? dateValue(session.effectiveTo) : null,
        participants: session.participants
          .map((participant) => ({
            id: participant.id,
            courseTeacherAssignmentId: participant.courseTeacherAssignmentId,
            courseOfferingId: participant.courseOfferingId,
            classLabel: classSectionLabel(
              participant.courseOffering.academicYearClassSection,
            ),
            subjectName: translatedName(participant.courseOffering.subject),
            track: participant.courseOffering.subject.track,
            effectiveFrom: dateValue(participant.effectiveFrom),
            effectiveTo: participant.effectiveTo
              ? dateValue(participant.effectiveTo)
              : null,
            lessonTopicEntries: participant.lessonTopicEntries.map((entry) => ({
              id: entry.id,
              academicCalendarDayId: entry.academicCalendarDayId,
              content: entry.content,
              updatedAt: entry.updatedAt.toISOString(),
            })),
            homeworkEntries: participant.homeworkEntries.map((entry) => ({
              id: entry.id,
              academicCalendarDayId: entry.academicCalendarDayId,
              title: entry.title,
              content: entry.content,
              updatedAt: entry.updatedAt.toISOString(),
            })),
            examNotificationEntries:
              participant.examNotificationEntries.map((entry) => ({
                id: entry.id,
                academicCalendarDayId: entry.academicCalendarDayId,
                content: entry.content,
                updatedAt: entry.updatedAt.toISOString(),
              })),
            commentEntries: participant.commentEntries.map((entry) => ({
              id: entry.id,
              academicCalendarDayId: entry.academicCalendarDayId,
              studentProfileId: entry.studentProfileId,
              category: entry.category,
              point: entry.point,
              content: entry.content,
              updatedAt: entry.updatedAt.toISOString(),
            })),
            attendanceRecords:
              participant.courseOffering.academicYearClassSection.attendanceRecords.map(
                (entry) => ({
                  id: entry.id,
                  academicCalendarDayId: entry.academicCalendarDayId,
                  studentProfileId: entry.studentProfileId,
                  status: entry.status,
                  openedAt: entry.openedAt.toISOString(),
                  openedBy: fullName(
                    entry.openedTeacherProfile.employment.person,
                  ),
                  lateAt: entry.lateAt?.toISOString() ?? null,
                  lateBy: entry.lateTeacherProfile
                    ? fullName(entry.lateTeacherProfile.employment.person)
                    : null,
                }),
              ),
            students:
              participant.courseOffering.academicYearClassSection.studentGroupPlacements
                .map((placement) => ({
                  id: placement.enrollment.student.id,
                  placementId: placement.id,
                  studentNumber: placement.enrollment.student.studentNumber,
                  fullName: fullName(placement.enrollment.student.person),
                  validFrom: dateValue(placement.validFrom),
                  validTo: placement.validTo
                    ? dateValue(placement.validTo)
                    : null,
                }))
                .sort((first, second) =>
                  first.studentNumber.localeCompare(
                    second.studentNumber,
                    locale,
                    { numeric: true },
                  ) || first.fullName.localeCompare(second.fullName, locale),
                ),
          }))
          .sort(
            (first, second) =>
              first.classLabel.localeCompare(second.classLabel, locale) ||
              first.subjectName.localeCompare(second.subjectName, locale),
          ),
      })),
      weeks:
        activeYear?.academicWeeks.map((week) => ({
          id: week.id,
          sequence: week.sequence,
          startDate: dateValue(week.startDate),
          endDate: dateValue(week.endDate),
          instructionalDayCount: week.instructionalDayCount,
          days: week.calendarDays.map((day) => ({
            id: day.id,
            date: dateValue(day.date),
            weekday: day.weekday,
            isInstructionalDay: day.isInstructionalDay,
          })),
        })) ?? [],
    },
  };
}
