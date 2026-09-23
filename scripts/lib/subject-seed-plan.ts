import type { SeedSubject } from "../data/legacy-subject-catalog";

export type ExistingSubject = {
  id: string;
  track: string;
  archivedAt: Date | null;
  translations: { locale: string; name: string }[];
};

export function planSubjectSeed(
  catalog: readonly SeedSubject[],
  existing: readonly ExistingSubject[],
) {
  const create: SeedSubject[] = [];
  const unchanged: string[] = [];
  const conflicts: string[] = [];
  const seen = new Map<string, string>();
  const existingNames = new Map<string, ExistingSubject>();

  for (const subject of existing) {
    for (const translation of subject.translations)
      existingNames.set(`${translation.locale}:${translation.name}`, subject);
  }

  for (const entry of catalog) {
    for (const locale of ["tr", "sq", "en"] as const) {
      const key = `${locale}:${entry[locale]}`;
      const previous = seen.get(key);
      if (previous)
        throw new Error(`Catalog has duplicate ${locale} name: ${entry[locale]} (${previous})`);
      seen.set(key, entry.sq);
    }

    const match = existingNames.get(`sq:${entry.sq}`);
    if (match) {
      const exact =
        !match.archivedAt &&
        match.track === entry.track &&
        (["tr", "sq", "en"] as const).every((locale) =>
          match.translations.some(
            (translation) =>
              translation.locale === locale && translation.name === entry[locale],
          ),
        );
      if (exact) unchanged.push(entry.sq);
      else conflicts.push(`${entry.sq}: existing record ${match.id} differs or is archived`);
      continue;
    }

    const collision = (["tr", "en"] as const).find((locale) =>
      existingNames.has(`${locale}:${entry[locale]}`),
    );
    if (collision) {
      conflicts.push(`${entry.sq}: ${collision} name belongs to another record`);
      continue;
    }
    create.push(entry);
  }

  return { create, unchanged, conflicts };
}
