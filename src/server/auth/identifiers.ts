export function normalizeUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(username) ? username : null;
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

// The caller supplies a server-resolved tenant, never a client-selected login mode.
export function loginIdentifier(kind: "platform" | "school", value: string) {
  return kind === "platform" ? normalizeEmail(value) : normalizeUsername(value);
}

export function isSameOrigin(
  origin: string | null,
  host: string | null,
  development: boolean,
) {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.host === host.toLowerCase() &&
      (url.protocol === "https:" || (development && url.protocol === "http:"))
    );
  } catch {
    return false;
  }
}
