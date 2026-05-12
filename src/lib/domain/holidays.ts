import { dateKey, makeUtcDate } from "./dates";
import type { HolidayType, ShiftFramework } from "./constants";

export type HolidaySeed = {
  date: Date;
  name: string;
  score: number;
  type: HolidayType;
  siteId?: string | null;
  defaultShiftFramework: ShiftFramework;
};

export function calculateEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return makeUtcDate(year, month, day);
}

export function getItalianNationalHolidays(year: number): HolidaySeed[] {
  const easter = calculateEasterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easter.getUTCDate() + 1);

  const fixed: Array<[number, number, string]> = [
    [1, 1, "Capodanno"],
    [1, 6, "Epifania"],
    [4, 25, "Festa della Liberazione"],
    [5, 1, "Festa dei Lavoratori"],
    [6, 2, "Festa della Repubblica"],
    [8, 15, "Ferragosto / Assunzione"],
    [11, 1, "Ognissanti"],
    [12, 8, "Immacolata Concezione"],
    [12, 25, "Natale"],
    [12, 26, "Santo Stefano"],
  ];

  return [
    ...fixed.map(([month, day, name]) => ({
      date: makeUtcDate(year, month, day),
      name,
      score: 2,
      type: "NATIONAL" as const,
      siteId: null,
      defaultShiftFramework: "DOUBLE_ONCALL_DAY_NIGHT" as const,
    })),
    {
      date: easter,
      name: "Pasqua",
      score: 2,
      type: "NATIONAL" as const,
      siteId: null,
      defaultShiftFramework: "DOUBLE_ONCALL_DAY_NIGHT" as const,
    },
    {
      date: easterMonday,
      name: "Lunedi dell'Angelo",
      score: 2,
      type: "NATIONAL" as const,
      siteId: null,
      defaultShiftFramework: "DOUBLE_ONCALL_DAY_NIGHT" as const,
    },
  ].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
}

export function holidayMatchesSite(holiday: { siteId?: string | null }, siteId: string) {
  return holiday.siteId == null || holiday.siteId === siteId;
}

export function findHolidayForDate<T extends { date: Date; type: HolidayType; siteId?: string | null }>(
  date: Date,
  holidays: T[],
  siteId: string,
) {
  const sameDay = holidays.filter((holiday) => dateKey(holiday.date) === dateKey(date) && holidayMatchesSite(holiday, siteId));
  const national = sameDay.find((holiday) => holiday.type === "NATIONAL");

  return (
    national ??
    sameDay.find((holiday) => holiday.type === "MANUAL") ??
    sameDay.find((holiday) => holiday.type === "LOCAL") ??
    sameDay.find((holiday) => holiday.type === "COMPANY") ??
    null
  );
}
