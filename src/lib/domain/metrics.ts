import type { DayType, ShiftFramework, ShiftType } from "./constants";
import { durationMinutes } from "./dates";
import { isOnCallShiftType, calculateHolidayScoreDistribution } from "./score";

export type PharmacistLite = {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  color: string;
};

export type ShiftMetricInput = {
  id: string;
  shiftType: ShiftType;
  pharmacistId: string | null;
  calendarDay: {
    date: Date;
    dayOfWeek: number;
    dayType: DayType;
    shiftFramework: ShiftFramework;
    holiday?: {
      score: number;
    } | null;
  };
};

export type CallMetricInput = {
  pharmacistId: string;
  startTime: string;
  endTime: string;
};

export type PharmacistMetrics = {
  pharmacistId: string;
  pharmacist: string;
  initials: string;
  color: string;
  onCallShifts: number;
  holidayScore: number;
  saturdayMornings: number;
  fridayAfternoons: number;
  callCount: number;
  callDurationMinutes: number;
};

export function createEmptyPharmacistMetrics(pharmacists: PharmacistLite[]) {
  return new Map(
    pharmacists.map((pharmacist) => [
      pharmacist.id,
      {
        pharmacistId: pharmacist.id,
        pharmacist: `${pharmacist.firstName} ${pharmacist.lastName}`,
        initials: pharmacist.initials,
        color: pharmacist.color,
        onCallShifts: 0,
        holidayScore: 0,
        saturdayMornings: 0,
        fridayAfternoons: 0,
        callCount: 0,
        callDurationMinutes: 0,
      } satisfies PharmacistMetrics,
    ]),
  );
}

export function calculatePharmacistMetrics(
  pharmacists: PharmacistLite[],
  shifts: ShiftMetricInput[],
  calls: CallMetricInput[],
) {
  const metricsByPharmacist = createEmptyPharmacistMetrics(pharmacists);

  for (const shift of shifts) {
    if (!shift.pharmacistId) {
      continue;
    }

    const metrics = metricsByPharmacist.get(shift.pharmacistId);
    if (!metrics) {
      continue;
    }

    if (isOnCallShiftType(shift.shiftType)) {
      metrics.onCallShifts += 1;
    }

    if (shift.shiftType === "SATURDAY_MORNING") {
      metrics.saturdayMornings += 1;
    }

    if (shift.shiftType === "AFTERNOON" && shift.calendarDay.dayOfWeek === 5) {
      metrics.fridayAfternoons += 1;
    }
  }

  const holidayShiftsByDate = new Map<string, ShiftMetricInput[]>();
  for (const shift of shifts) {
    if (!shift.calendarDay.holiday) {
      continue;
    }
    const key = shift.calendarDay.date.toISOString().slice(0, 10);
    holidayShiftsByDate.set(key, [...(holidayShiftsByDate.get(key) ?? []), shift]);
  }

  for (const holidayShifts of holidayShiftsByDate.values()) {
    const holiday = holidayShifts[0]?.calendarDay.holiday;
    if (!holiday) {
      continue;
    }

    const distribution = calculateHolidayScoreDistribution(
      holiday.score,
      holidayShifts.map((shift) => ({
        id: shift.id,
        pharmacistId: shift.pharmacistId,
        shiftType: shift.shiftType,
      })),
    );

    for (const item of distribution) {
      if (!item.pharmacistId) {
        continue;
      }
      const metrics = metricsByPharmacist.get(item.pharmacistId);
      if (metrics) {
        metrics.holidayScore += item.score;
      }
    }
  }

  for (const call of calls) {
    const metrics = metricsByPharmacist.get(call.pharmacistId);
    if (!metrics) {
      continue;
    }
    metrics.callCount += 1;
    metrics.callDurationMinutes += durationMinutes(call.startTime, call.endTime);
  }

  return [...metricsByPharmacist.values()];
}

export function calculateMonthlyOnCallCounts(
  shifts: Array<{ shiftType: ShiftType; pharmacistId?: string | null; pharmacist?: PharmacistLite | null }>,
) {
  const onCall = shifts.filter((shift) => isOnCallShiftType(shift.shiftType));
  const assigned = onCall.filter((shift) => Boolean(shift.pharmacistId));
  const byPharmacist = new Map<string, { pharmacist: string; initials: string; color: string; count: number }>();

  for (const shift of assigned) {
    if (!shift.pharmacistId || !shift.pharmacist) {
      continue;
    }

    const current = byPharmacist.get(shift.pharmacistId) ?? {
      pharmacist: `${shift.pharmacist.firstName} ${shift.pharmacist.lastName}`,
      initials: shift.pharmacist.initials,
      color: shift.pharmacist.color,
      count: 0,
    };
    current.count += 1;
    byPharmacist.set(shift.pharmacistId, current);
  }

  return {
    assignable: onCall.length,
    assigned: assigned.length,
    uncovered: onCall.length - assigned.length,
    byPharmacist: [...byPharmacist.values()].sort((a, b) => b.count - a.count),
  };
}
