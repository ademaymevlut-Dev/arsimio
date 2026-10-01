import { dateOnlyValue } from "./academic-calendar-validation";

export type AcademicCalendarWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY";

export type AcademicCalendarTermSource = {
  id: string;
  sequence: number;
  startDate: Date;
  endDate: Date;
};

export type GeneratedAcademicWeek = {
  key: string;
  academicTermId: string;
  sequence: number;
  startDate: Date;
  endDate: Date;
  instructionalDayCount: number;
};

export type GeneratedAcademicCalendarDay = {
  weekKey: string;
  academicTermId: string;
  date: Date;
  weekday: AcademicCalendarWeekday;
};

export type GeneratedAcademicCalendarPlan = {
  weeks: GeneratedAcademicWeek[];
  days: GeneratedAcademicCalendarDay[];
};

const DAY_MS = 86_400_000;

function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function weekday(date: Date): AcademicCalendarWeekday | null {
  if (date.getUTCDay() === 1) return "MONDAY";
  if (date.getUTCDay() === 2) return "TUESDAY";
  if (date.getUTCDay() === 3) return "WEDNESDAY";
  if (date.getUTCDay() === 4) return "THURSDAY";
  if (date.getUTCDay() === 5) return "FRIDAY";
  return null;
}

function mondayKey(date: Date) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return dateOnlyValue(addDays(date, offset));
}

export function buildAcademicCalendarPlan(
  terms: AcademicCalendarTermSource[],
): GeneratedAcademicCalendarPlan {
  const sortedTerms = [...terms].sort(
    (first, second) =>
      first.sequence - second.sequence ||
      first.startDate.getTime() - second.startDate.getTime() ||
      first.id.localeCompare(second.id),
  );
  const weeks: GeneratedAcademicWeek[] = [];
  const days: GeneratedAcademicCalendarDay[] = [];
  const weekByKey = new Map<string, GeneratedAcademicWeek>();
  let weekSequence = 0;

  for (const term of sortedTerms) {
    for (
      let current = term.startDate;
      current <= term.endDate;
      current = addDays(current, 1)
    ) {
      const day = weekday(current);
      if (!day) continue;
      const key = `${term.id}:${mondayKey(current)}`;
      let week = weekByKey.get(key);
      if (!week) {
        weekSequence += 1;
        week = {
          key,
          academicTermId: term.id,
          sequence: weekSequence,
          startDate: current,
          endDate: current,
          instructionalDayCount: 0,
        };
        weekByKey.set(key, week);
        weeks.push(week);
      }
      if (current < week.startDate) week.startDate = current;
      if (current > week.endDate) week.endDate = current;
      week.instructionalDayCount += 1;
      days.push({
        weekKey: key,
        academicTermId: term.id,
        date: current,
        weekday: day,
      });
    }
  }

  return { weeks, days };
}
