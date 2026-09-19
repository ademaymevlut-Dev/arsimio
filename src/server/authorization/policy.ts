export type SchoolAccessInput = {
  userStatus: string;
  schoolStatus: string;
  membershipStatus: string;
  membershipSchoolId: string;
  tenantSchoolId: string;
  resourceSchoolId: string;
  permissions: readonly string[];
};

export function canAccessSchool(input: SchoolAccessInput, permission: string) {
  return (
    input.userStatus === "ACTIVE" &&
    input.schoolStatus === "ACTIVE" &&
    input.membershipStatus === "ACTIVE" &&
    input.membershipSchoolId === input.tenantSchoolId &&
    input.resourceSchoolId === input.tenantSchoolId &&
    input.permissions.includes(permission)
  );
}
