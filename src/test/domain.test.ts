import { describe, expect, it } from "vitest";
import {
  assertCalendarYearNotDuplicated,
  buildYearPlan,
  calculateHolidayScoreDistribution,
  dateInputRange,
  getItalianNationalHolidays,
  intersectDateRanges,
  makeUtcDate,
  resolveAssignmentForCallStart,
  resolveDayPlan,
} from "@/lib/domain";

const siteId = "site-1";
const settings = {
  dayOnCallStartTime: "08:00",
  dayOnCallEndTime: "20:00",
  nightOnCallStartTime: "20:00",
  nightOnCallEndTime: "08:00",
};

describe("generazione calendario annuale", () => {
  it("anno normale genera 365 giorni", () => {
    const plan = buildYearPlan(2025, siteId, getItalianNationalHolidays(2025));
    expect(plan).toHaveLength(365);
  });

  it("anno bisestile genera 366 giorni", () => {
    const plan = buildYearPlan(2024, siteId, getItalianNationalHolidays(2024));
    expect(plan).toHaveLength(366);
  });

  it("impedisce duplicato stesso anno/presidio", () => {
    expect(() => assertCalendarYearNotDuplicated([{ year: 2026, siteId }], 2026, siteId)).toThrow();
  });
});

describe("regole tipo giorno", () => {
  it("domenica genera doppia reperibilita", () => {
    const plan = resolveDayPlan(makeUtcDate(2026, 1, 4), [], siteId);
    expect(plan.dayType).toBe("SUNDAY");
    expect(plan.shiftFramework).toBe("DOUBLE_ONCALL_DAY_NIGHT");
    expect(plan.shiftTypes).toEqual(["ON_CALL_DAY", "ON_CALL_NIGHT"]);
  });

  it("sabato ordinario genera mattina + reperibilita", () => {
    const plan = resolveDayPlan(makeUtcDate(2026, 1, 3), [], siteId);
    expect(plan.dayType).toBe("SATURDAY");
    expect(plan.shiftFramework).toBe("SATURDAY_MORNING_ONCALL");
  });

  it("feriale ordinario genera pomeriggio + reperibilita", () => {
    const plan = resolveDayPlan(makeUtcDate(2026, 1, 2), [], siteId);
    expect(plan.dayType).toBe("WEEKDAY");
    expect(plan.shiftFramework).toBe("WEEKDAY_AFTERNOON_ONCALL");
  });

  it("Natale genera doppia reperibilita anche se cade di sabato o feriale", () => {
    const holidays = getItalianNationalHolidays(2021);
    const plan = resolveDayPlan(makeUtcDate(2021, 12, 25), holidays, siteId);
    expect(plan.dayType).toBe("NATIONAL_HOLIDAY");
    expect(plan.shiftFramework).toBe("DOUBLE_ONCALL_DAY_NIGHT");
  });
});

describe("festivi", () => {
  it("festivo nazionale viene riconosciuto", () => {
    const holidays = getItalianNationalHolidays(2026);
    const plan = resolveDayPlan(makeUtcDate(2026, 1, 1), holidays, siteId);
    expect(plan.holiday?.type).toBe("NATIONAL");
    expect(plan.dayType).toBe("NATIONAL_HOLIDAY");
  });

  it("festivo manuale usa il framework scelto", () => {
    const plan = resolveDayPlan(
      makeUtcDate(2026, 3, 10),
      [
        {
          date: makeUtcDate(2026, 3, 10),
          type: "MANUAL",
          siteId,
          defaultShiftFramework: "SATURDAY_MORNING_ONCALL",
        },
      ],
      siteId,
    );
    expect(plan.dayType).toBe("MANUAL_HOLIDAY");
    expect(plan.shiftFramework).toBe("SATURDAY_MORNING_ONCALL");
  });

  it("priorita festivo > domenica > sabato > feriale", () => {
    const plan = resolveDayPlan(
      makeUtcDate(2026, 1, 4),
      [
        {
          date: makeUtcDate(2026, 1, 4),
          type: "MANUAL",
          siteId,
          defaultShiftFramework: "WEEKDAY_AFTERNOON_ONCALL",
        },
      ],
      siteId,
    );
    expect(plan.dayType).toBe("MANUAL_HOLIDAY");
    expect(plan.shiftFramework).toBe("WEEKDAY_AFTERNOON_ONCALL");
  });
});

describe("score festivi", () => {
  it("score 2 con doppia reperibilita assegna 1 alla diurna e 1 alla notturna", () => {
    const score = calculateHolidayScoreDistribution(2, [
      { id: "day", shiftType: "ON_CALL_DAY", pharmacistId: "a" },
      { id: "night", shiftType: "ON_CALL_NIGHT", pharmacistId: "b" },
    ]);
    expect(score.map((item) => item.score)).toEqual([1, 1]);
  });

  it("score 1 con doppia reperibilita assegna 0.5 alla diurna e 0.5 alla notturna", () => {
    const score = calculateHolidayScoreDistribution(1, [
      { id: "day", shiftType: "ON_CALL_DAY", pharmacistId: "a" },
      { id: "night", shiftType: "ON_CALL_NIGHT", pharmacistId: "b" },
    ]);
    expect(score.map((item) => item.score)).toEqual([0.5, 0.5]);
  });

  it("framework pomeriggio + reperibilita assegna tutto lo score solo alla reperibilita", () => {
    const score = calculateHolidayScoreDistribution(2, [
      { id: "afternoon", shiftType: "AFTERNOON", pharmacistId: "a" },
      { id: "call", shiftType: "ON_CALL_WEEKDAY", pharmacistId: "b" },
    ]);
    expect(score).toEqual([{ assignmentId: "call", pharmacistId: "b", score: 2 }]);
  });

  it("framework mattina + reperibilita assegna tutto lo score solo alla reperibilita", () => {
    const score = calculateHolidayScoreDistribution(2, [
      { id: "morning", shiftType: "SATURDAY_MORNING", pharmacistId: "a" },
      { id: "call", shiftType: "ON_CALL_SATURDAY", pharmacistId: "b" },
    ]);
    expect(score).toEqual([{ assignmentId: "call", pharmacistId: "b", score: 2 }]);
  });
});

describe("chiamate", () => {
  const assignments = [
    { id: "day", shiftType: "ON_CALL_DAY" as const, pharmacistId: "day-pharmacist" },
    { id: "night", shiftType: "ON_CALL_NIGHT" as const, pharmacistId: "night-pharmacist" },
  ];

  it("ora 10:00 seleziona reperibilita diurna", () => {
    expect(resolveAssignmentForCallStart(assignments, "10:00", settings)?.pharmacistId).toBe("day-pharmacist");
  });

  it("ora 19:59 seleziona reperibilita diurna", () => {
    expect(resolveAssignmentForCallStart(assignments, "19:59", settings)?.pharmacistId).toBe("day-pharmacist");
  });

  it("ora 20:00 seleziona reperibilita notturna", () => {
    expect(resolveAssignmentForCallStart(assignments, "20:00", settings)?.pharmacistId).toBe("night-pharmacist");
  });

  it("ora 07:59 seleziona reperibilita notturna", () => {
    expect(resolveAssignmentForCallStart(assignments, "07:59", settings)?.pharmacistId).toBe("night-pharmacist");
  });

  it("chiamata 19:45-20:30 usa il farmacista dell'ora di inizio", () => {
    expect(resolveAssignmentForCallStart(assignments, "19:45", settings)?.pharmacistId).toBe("day-pharmacist");
  });
});

describe("filtri data", () => {
  it("rende inclusiva la data finale inserita nei filtri", () => {
    const range = dateInputRange("2026-05-08", "2026-05-08");
    expect(range?.start?.toISOString().slice(0, 10)).toBe("2026-05-08");
    expect(range?.end?.toISOString().slice(0, 10)).toBe("2026-05-09");
  });

  it("interseca il periodo calendario con il periodo scelto dall'utente", () => {
    const range = intersectDateRanges(
      { start: makeUtcDate(2026, 1, 1), end: makeUtcDate(2027, 1, 1) },
      dateInputRange("2026-05-08", "2026-05-31"),
    );

    expect(range?.start?.toISOString().slice(0, 10)).toBe("2026-05-08");
    expect(range?.end?.toISOString().slice(0, 10)).toBe("2026-06-01");
  });
});
