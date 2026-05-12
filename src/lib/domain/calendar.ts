import type { DayType, HolidayType, ShiftFramework, ShiftType } from "./constants";
import { getDatesInYear, getUtcDayOfWeek } from "./dates";
import { findHolidayForDate } from "./holidays";

export type HolidayLike = {
  id?: string;
  date: Date;
  type: HolidayType;
  siteId?: string | null;
  defaultShiftFramework: ShiftFramework;
};

export type DayPlan = {
  date: Date;
  dayOfWeek: number;
  dayType: DayType;
  holiday: HolidayLike | null;
  shiftFramework: ShiftFramework;
  shiftTypes: ShiftType[];
};

export function shiftTypesForFramework(framework: ShiftFramework): ShiftType[] {
  switch (framework) {
    case "WEEKDAY_AFTERNOON_ONCALL":
      return ["AFTERNOON", "ON_CALL_WEEKDAY"];
    case "SATURDAY_MORNING_ONCALL":
      return ["SATURDAY_MORNING", "ON_CALL_SATURDAY"];
    case "DOUBLE_ONCALL_DAY_NIGHT":
      return ["ON_CALL_DAY", "ON_CALL_NIGHT"];
    case "CUSTOM":
      return [];
  }
}

export function dayTypeForHoliday(type: HolidayType): DayType {
  switch (type) {
    case "NATIONAL":
      return "NATIONAL_HOLIDAY";
    case "MANUAL":
      return "MANUAL_HOLIDAY";
    case "LOCAL":
      return "LOCAL_HOLIDAY";
    case "COMPANY":
      return "COMPANY_HOLIDAY";
  }
}

export function resolveDayPlan(date: Date, holidays: HolidayLike[], siteId: string): DayPlan {
  const holiday = findHolidayForDate(date, holidays, siteId);
  const dayOfWeek = getUtcDayOfWeek(date);

  if (holiday) {
    const shiftFramework =
      holiday.type === "NATIONAL" ? "DOUBLE_ONCALL_DAY_NIGHT" : holiday.defaultShiftFramework;

    return {
      date,
      dayOfWeek,
      dayType: dayTypeForHoliday(holiday.type),
      holiday,
      shiftFramework,
      shiftTypes: shiftTypesForFramework(shiftFramework),
    };
  }

  if (dayOfWeek === 0) {
    return {
      date,
      dayOfWeek,
      dayType: "SUNDAY",
      holiday: null,
      shiftFramework: "DOUBLE_ONCALL_DAY_NIGHT",
      shiftTypes: shiftTypesForFramework("DOUBLE_ONCALL_DAY_NIGHT"),
    };
  }

  if (dayOfWeek === 6) {
    return {
      date,
      dayOfWeek,
      dayType: "SATURDAY",
      holiday: null,
      shiftFramework: "SATURDAY_MORNING_ONCALL",
      shiftTypes: shiftTypesForFramework("SATURDAY_MORNING_ONCALL"),
    };
  }

  return {
    date,
    dayOfWeek,
    dayType: "WEEKDAY",
    holiday: null,
    shiftFramework: "WEEKDAY_AFTERNOON_ONCALL",
    shiftTypes: shiftTypesForFramework("WEEKDAY_AFTERNOON_ONCALL"),
  };
}

export function buildYearPlan(year: number, siteId: string, holidays: HolidayLike[]) {
  return getDatesInYear(year).map((date) => resolveDayPlan(date, holidays, siteId));
}

export function assertCalendarYearNotDuplicated(
  existing: Array<{ year: number; siteId: string }>,
  year: number,
  siteId: string,
) {
  if (existing.some((calendar) => calendar.year === year && calendar.siteId === siteId)) {
    throw new Error("Esiste gia un calendario per questo anno e presidio.");
  }
}
