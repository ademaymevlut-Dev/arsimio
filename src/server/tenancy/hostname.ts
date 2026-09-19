import { PLATFORM_HOSTNAME, PILOT_SCHOOLS } from "../../config/pilot";

export function normalizeHostname(value: string | null): string | null {
  if (!value || value !== value.trim() || /[\s/@\\?#,%]/.test(value))
    return null;
  // No forwarded-host chains, userinfo, URL parsing tricks, or arbitrary ports.
  const match = /^([a-zA-Z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(value);
  if (!match || (match[2] && (+match[2] < 1 || +match[2] > 65535))) return null;
  const hostname = match[1].toLowerCase().replace(/\.$/, "");
  if (
    hostname.length > 253 ||
    !hostname
      .split(".")
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    return null;
  return hostname;
}

export function classifyHostname(hostname: string, development = false) {
  if (
    hostname === PLATFORM_HOSTNAME ||
    (development && hostname === "localhost")
  ) {
    return { kind: "platform" as const, hostname };
  }
  if (development) {
    const school = PILOT_SCHOOLS.find(
      (s) => hostname === `${s.slug}.localhost`,
    );
    if (school) return { kind: "school" as const, hostname: school.hostname };
  }
  // No suffix trust: every other hostname must be looked up in school_domains.
  return { kind: "school" as const, hostname };
}

export function domainIsUsable(
  domain: {
    status: string;
    verifiedAt: Date | null;
    school: { status: string; archivedAt: Date | null };
  } | null,
): boolean {
  return Boolean(
    domain &&
    domain.status === "VERIFIED" &&
    domain.verifiedAt &&
    domain.school.status === "ACTIVE" &&
    !domain.school.archivedAt,
  );
}
