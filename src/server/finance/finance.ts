import "server-only";
import type {
  StudentFinanceContractItemKind,
  StudentFinanceContractItemStatus,
  StudentFinanceContractStatus,
  StudentFinanceInstallmentKind,
  StudentFinanceInstallmentStatus,
  StudentFinancePaymentStatus,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { validSchoolId } from "@/lib/platform-school-validation";
import { calculateStudentFinanceBalance } from "@/lib/finance-validation";

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function dateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function money(value: { toString(): string }) {
  return value.toString();
}

function parseCents(value: string) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return ZERO;
  const sign = match[1] === "-" ? -BigInt(1) : BigInt(1);
  return (
    sign *
    (BigInt(match[2]) * HUNDRED +
      BigInt((match[3] ?? "").padEnd(2, "0")))
  );
}

function formatCents(cents: bigint) {
  const sign = cents < ZERO ? "-" : "";
  const absolute = cents < ZERO ? -cents : cents;
  return `${sign}${absolute / HUNDRED}.${(absolute % HUNDRED)
    .toString()
    .padStart(2, "0")}`;
}

function addCents(values: Array<{ toString(): string }>): bigint {
  return values.reduce<bigint>(
    (sum, value) => sum + parseCents(value.toString()),
    ZERO,
  );
}

function summarize(
  items: Array<{ netAmount: { toString(): string } }>,
  payments: Array<{ amount: { toString(): string } }>,
) {
  return (
    calculateStudentFinanceBalance(
      items.map((item) => money(item.netAmount)),
      payments.map((payment) => money(payment.amount)),
    ) ?? {
      totalDebt: "0.00",
      totalPaid: "0.00",
      remainingBalance: "0.00",
      overpaidAmount: "0.00",
    }
  );
}

export type StudentFinanceContext = {
  academicYears: Array<{ id: string; name: string; status: string }>;
  students: Array<{
    id: string;
    studentNumber: string;
    fullName: string;
    guardians: Array<{
      relationshipId: string;
      fullName: string;
      relationshipType: string;
      isFinancialResponsible: boolean;
      isPrimaryContact: boolean;
    }>;
  }>;
};

export type StudentFinanceContractSummary = {
  id: string;
  revision: string;
  protocolNumber: string;
  displayNumber: string;
  status: StudentFinanceContractStatus;
  currencyCode: string;
  issuedOn: string;
  academicYear: { id: string; name: string };
  student: { id: string; studentNumber: string; fullName: string };
  responsibleGuardian: {
    relationshipId: string;
    personId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  totals: {
    totalDebt: string;
    totalPaid: string;
    remainingBalance: string;
    overpaidAmount: string;
  };
};

export type StudentFinanceOverviewLine = {
  contractId: string;
  displayNumber: string;
  student: { id: string; studentNumber: string; fullName: string };
  responsibleGuardian: {
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  currencyCode: string;
  label: string;
  dueDate: string | null;
  amount: string;
};

export type StudentFinanceOverview = {
  currencyCode: string;
  totals: {
    grossTotal: string;
    discountTotal: string;
    netTotal: string;
    totalPaid: string;
    remainingBalance: string;
    overpaidAmount: string;
    activeContractCount: number;
  };
  debtors: StudentFinanceOverviewLine[];
  upcomingDues: StudentFinanceOverviewLine[];
  overdueDues: StudentFinanceOverviewLine[];
};

export type StudentFinanceContractDetail = StudentFinanceContractSummary & {
  note: string | null;
  items: Array<{
    id: string;
    revision: string;
    kind: StudentFinanceContractItemKind;
    description: string;
    grossAmount: string;
    discountRate: string;
    discountAmount: string;
    netAmount: string;
    status: StudentFinanceContractItemStatus;
    sortOrder: number;
    note: string | null;
  }>;
  installments: Array<{
    id: string;
    kind: StudentFinanceInstallmentKind;
    sequence: number;
    label: string;
    dueDate: string;
    amount: string;
    status: StudentFinanceInstallmentStatus;
    note: string | null;
  }>;
  payments: Array<{
    id: string;
    revision: string;
    paidOn: string;
    amount: string;
    description: string;
    status: StudentFinancePaymentStatus;
  }>;
};

function mapContractSummary(contract: {
  id: string;
  updatedAt: Date;
  protocolNumber: string;
  status: StudentFinanceContractStatus;
  currencyCode: string;
  issuedOn: Date;
  academicYear: { id: string; name: string };
  studentProfile: {
    id: string;
    studentNumber: string;
    person: { firstName: string; middleName: string | null; lastName: string };
  };
  responsibleGuardianRelationship: {
    id: string;
    guardianPersonId: string;
    guardianPerson: {
      firstName: string;
      middleName: string | null;
      lastName: string;
      contactPoints: Array<{ kind: string; value: string }>;
    };
  };
  items: Array<{ netAmount: { toString(): string } }>;
  payments: Array<{ amount: { toString(): string } }>;
}): StudentFinanceContractSummary {
  const guardian = contract.responsibleGuardianRelationship.guardianPerson;
  const phone = guardian.contactPoints.find((point) => point.kind === "PHONE");
  const email = guardian.contactPoints.find((point) => point.kind === "EMAIL");
  return {
    id: contract.id,
    revision: contract.updatedAt.toISOString(),
    protocolNumber: contract.protocolNumber,
    displayNumber: `${contract.academicYear.name} - Protocol ${contract.protocolNumber}`,
    status: contract.status,
    currencyCode: contract.currencyCode,
    issuedOn: dateOnly(contract.issuedOn)!,
    academicYear: contract.academicYear,
    student: {
      id: contract.studentProfile.id,
      studentNumber: contract.studentProfile.studentNumber,
      fullName: fullName(contract.studentProfile.person),
    },
    responsibleGuardian: {
      relationshipId: contract.responsibleGuardianRelationship.id,
      personId: contract.responsibleGuardianRelationship.guardianPersonId,
      fullName: fullName(guardian),
      phone: phone?.value ?? null,
      email: email?.value ?? null,
    },
    totals: summarize(contract.items, contract.payments),
  };
}

export async function getStudentFinanceContext(
  schoolId: string,
): Promise<StudentFinanceContext> {
  const [academicYears, students] = await Promise.all([
    getPrisma().academicYear.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: [{ startDate: "desc" }],
      select: { id: true, name: true, status: true },
    }),
    getPrisma().studentProfile.findMany({
      where: { schoolId },
      orderBy: [{ status: "asc" }, { person: { lastName: "asc" } }],
      take: 500,
      include: {
        person: true,
        guardianRelationships: {
          where: { archivedAt: null },
          orderBy: [
            { isFinancialResponsible: "desc" },
            { isPrimaryContact: "desc" },
            { relationshipType: "asc" },
          ],
          include: { guardianPerson: true },
        },
      },
    }),
  ]);

  return {
    academicYears,
    students: students.map((student) => ({
      id: student.id,
      studentNumber: student.studentNumber,
      fullName: fullName(student.person),
      guardians: student.guardianRelationships.map((relationship) => ({
        relationshipId: relationship.id,
        fullName: fullName(relationship.guardianPerson),
        relationshipType: relationship.relationshipType,
        isFinancialResponsible: relationship.isFinancialResponsible,
        isPrimaryContact: relationship.isPrimaryContact,
      })),
    })),
  };
}

export async function getStudentFinanceContracts(
  schoolId: string,
  filters: {
    query?: string;
    academicYearId?: string;
    status?: StudentFinanceContractStatus;
  } = {},
): Promise<StudentFinanceContractSummary[]> {
  const query = filters.query?.trim().slice(0, 120);
  const contracts = await getPrisma().studentFinanceContract.findMany({
    where: {
      schoolId,
      ...(filters.academicYearId && validSchoolId(filters.academicYearId)
        ? { academicYearId: filters.academicYearId }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { protocolNumber: { contains: query, mode: "insensitive" } },
              { studentProfile: { studentNumber: { contains: query } } },
              {
                studentProfile: {
                  person: { firstName: { contains: query, mode: "insensitive" } },
                },
              },
              {
                studentProfile: {
                  person: { lastName: { contains: query, mode: "insensitive" } },
                },
              },
              {
                responsibleGuardianRelationship: {
                  guardianPerson: {
                    firstName: { contains: query, mode: "insensitive" },
                  },
                },
              },
              {
                responsibleGuardianRelationship: {
                  guardianPerson: {
                    lastName: { contains: query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      { academicYear: { startDate: "desc" } },
      { protocolNumber: "asc" },
    ],
    take: 250,
    include: {
      academicYear: { select: { id: true, name: true } },
      studentProfile: { include: { person: true } },
      responsibleGuardianRelationship: {
        include: {
          guardianPerson: {
            include: { contactPoints: { where: { archivedAt: null } } },
          },
        },
      },
      items: { where: { status: "ACTIVE" }, select: { netAmount: true } },
      payments: { where: { status: "ACTIVE" }, select: { amount: true } },
    },
  });

  return contracts.map(mapContractSummary);
}

export async function getStudentFinanceOverview(
  schoolId: string,
  filters: {
    academicYearId?: string;
    status?: StudentFinanceContractStatus;
  } = {},
  todayIso: string,
): Promise<StudentFinanceOverview> {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const upcomingLimit = new Date(today.getTime() + THIRTY_DAYS_MS);
  const contracts = await getPrisma().studentFinanceContract.findMany({
    where: {
      schoolId,
      status: filters.status ?? "ACTIVE",
      ...(filters.academicYearId && validSchoolId(filters.academicYearId)
        ? { academicYearId: filters.academicYearId }
        : {}),
    },
    orderBy: [
      { academicYear: { startDate: "desc" } },
      { protocolNumber: "asc" },
    ],
    include: {
      academicYear: { select: { id: true, name: true } },
      studentProfile: { include: { person: true } },
      responsibleGuardianRelationship: {
        include: {
          guardianPerson: {
            include: { contactPoints: { where: { archivedAt: null } } },
          },
        },
      },
      items: { where: { status: "ACTIVE" } },
      installments: {
        where: { status: "ACTIVE" },
        orderBy: [{ sequence: "asc" }],
      },
      payments: { where: { status: "ACTIVE" } },
    },
  });

  let grossTotal = ZERO;
  let discountTotal = ZERO;
  let netTotal = ZERO;
  let totalPaid = ZERO;
  const debtors: StudentFinanceOverviewLine[] = [];
  const upcomingDues: StudentFinanceOverviewLine[] = [];
  const overdueDues: StudentFinanceOverviewLine[] = [];

  for (const contract of contracts) {
    const guardian = contract.responsibleGuardianRelationship.guardianPerson;
    const phone = guardian.contactPoints.find((point) => point.kind === "PHONE");
    const email = guardian.contactPoints.find((point) => point.kind === "EMAIL");
    const gross = addCents(contract.items.map((item) => item.grossAmount));
    const discount = addCents(contract.items.map((item) => item.discountAmount));
    const net = addCents(contract.items.map((item) => item.netAmount));
    const paid = addCents(contract.payments.map((payment) => payment.amount));
    const remaining = net - paid;
    const baseLine = {
      contractId: contract.id,
      displayNumber: `${contract.academicYear.name} - Protocol ${contract.protocolNumber}`,
      student: {
        id: contract.studentProfile.id,
        studentNumber: contract.studentProfile.studentNumber,
        fullName: fullName(contract.studentProfile.person),
      },
      responsibleGuardian: {
        fullName: fullName(guardian),
        phone: phone?.value ?? null,
        email: email?.value ?? null,
      },
      currencyCode: contract.currencyCode,
    };

    grossTotal += gross;
    discountTotal += discount;
    netTotal += net;
    totalPaid += paid;

    if (remaining > ZERO) {
      debtors.push({
        ...baseLine,
        label: contract.protocolNumber,
        dueDate: null,
        amount: formatCents(remaining),
      });
    }

    let unappliedPaid = paid;
    for (const installment of contract.installments) {
      const installmentAmount = parseCents(installment.amount.toString());
      const covered =
        unappliedPaid >= installmentAmount ? installmentAmount : unappliedPaid;
      const installmentRemaining = installmentAmount - covered;
      unappliedPaid -= covered;
      if (installmentRemaining <= ZERO) continue;

      const dueDateOnly = dateOnly(installment.dueDate)!;
      const dueDate = new Date(`${dueDateOnly}T00:00:00.000Z`);
      const line = {
        ...baseLine,
        label: installment.label,
        dueDate: dueDateOnly,
        amount: formatCents(installmentRemaining),
      };
      if (dueDate < today) overdueDues.push(line);
      else if (dueDate <= upcomingLimit) upcomingDues.push(line);
    }
  }

  const remainingBalance = netTotal - totalPaid;
  const byAmountDesc = (
    a: StudentFinanceOverviewLine,
    b: StudentFinanceOverviewLine,
  ) => {
    const diff = parseCents(b.amount) - parseCents(a.amount);
    return diff > ZERO ? 1 : diff < ZERO ? -1 : 0;
  };
  const byDueDate = (
    a: StudentFinanceOverviewLine,
    b: StudentFinanceOverviewLine,
  ) => String(a.dueDate).localeCompare(String(b.dueDate));

  return {
    currencyCode: contracts[0]?.currencyCode ?? "EUR",
    totals: {
      grossTotal: formatCents(grossTotal),
      discountTotal: formatCents(discountTotal),
      netTotal: formatCents(netTotal),
      totalPaid: formatCents(totalPaid),
      remainingBalance: formatCents(
        remainingBalance > ZERO ? remainingBalance : ZERO,
      ),
      overpaidAmount: formatCents(
        remainingBalance < ZERO ? -remainingBalance : ZERO,
      ),
      activeContractCount: contracts.length,
    },
    debtors: debtors.sort(byAmountDesc).slice(0, 50),
    upcomingDues: upcomingDues.sort(byDueDate).slice(0, 50),
    overdueDues: overdueDues.sort(byDueDate).slice(0, 50),
  };
}

export async function getStudentFinanceContractDetail(
  schoolId: string,
  contractId: string,
): Promise<StudentFinanceContractDetail | null> {
  if (!validSchoolId(contractId)) return null;
  const contract = await getPrisma().studentFinanceContract.findFirst({
    where: { id: contractId, schoolId },
    include: {
      academicYear: { select: { id: true, name: true } },
      studentProfile: { include: { person: true } },
      responsibleGuardianRelationship: {
        include: {
          guardianPerson: {
            include: { contactPoints: { where: { archivedAt: null } } },
          },
        },
      },
      items: { orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      installments: { orderBy: [{ sequence: "asc" }] },
      payments: { orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!contract) return null;
  const activeItems = contract.items.filter((item) => item.status === "ACTIVE");
  const activePayments = contract.payments.filter(
    (payment) => payment.status === "ACTIVE",
  );
  return {
    ...mapContractSummary({
      ...contract,
      items: activeItems,
      payments: activePayments,
    }),
    note: contract.note,
    items: contract.items.map((item) => ({
      id: item.id,
      revision: item.updatedAt.toISOString(),
      kind: item.kind,
      description: item.description,
      grossAmount: money(item.grossAmount),
      discountRate: money(item.discountRate),
      discountAmount: money(item.discountAmount),
      netAmount: money(item.netAmount),
      status: item.status,
      sortOrder: item.sortOrder,
      note: item.note,
    })),
    installments: contract.installments.map((installment) => ({
      id: installment.id,
      kind: installment.kind,
      sequence: installment.sequence,
      label: installment.label,
      dueDate: dateOnly(installment.dueDate)!,
      amount: money(installment.amount),
      status: installment.status,
      note: installment.note,
    })),
    payments: contract.payments.map((payment) => ({
      id: payment.id,
      revision: payment.updatedAt.toISOString(),
      paidOn: dateOnly(payment.paidOn)!,
      amount: money(payment.amount),
      description: payment.description,
      status: payment.status,
    })),
  };
}

export async function getStudentFinanceContractsForStudent(
  schoolId: string,
  studentProfileId: string,
) {
  if (!validSchoolId(studentProfileId)) return [];
  const contracts = await getPrisma().studentFinanceContract.findMany({
    where: { schoolId, studentProfileId },
    orderBy: [
      { academicYear: { startDate: "desc" } },
      { protocolNumber: "asc" },
    ],
    include: {
      academicYear: { select: { id: true, name: true } },
      studentProfile: { include: { person: true } },
      responsibleGuardianRelationship: {
        include: {
          guardianPerson: {
            include: { contactPoints: { where: { archivedAt: null } } },
          },
        },
      },
      items: { where: { status: "ACTIVE" }, select: { netAmount: true } },
      payments: { where: { status: "ACTIVE" }, select: { amount: true } },
    },
  });
  return contracts.map(mapContractSummary);
}

export async function getStudentFinanceContractsForGuardian(
  schoolId: string,
  guardianPersonId: string,
) {
  if (!validSchoolId(guardianPersonId)) return [];
  const contracts = await getPrisma().studentFinanceContract.findMany({
    where: {
      schoolId,
      responsibleGuardianRelationship: { guardianPersonId },
    },
    orderBy: [
      { academicYear: { startDate: "desc" } },
      { protocolNumber: "asc" },
    ],
    include: {
      academicYear: { select: { id: true, name: true } },
      studentProfile: { include: { person: true } },
      responsibleGuardianRelationship: {
        include: {
          guardianPerson: {
            include: { contactPoints: { where: { archivedAt: null } } },
          },
        },
      },
      items: { where: { status: "ACTIVE" }, select: { netAmount: true } },
      payments: { where: { status: "ACTIVE" }, select: { amount: true } },
    },
  });
  return contracts.map(mapContractSummary);
}
