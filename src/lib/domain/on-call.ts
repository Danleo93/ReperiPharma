import type { ShiftType } from "./constants";
import { minutesFromTime } from "./dates";
import { isOnCallShiftType } from "./score";

export type OnCallSettings = {
  dayOnCallStartTime: string;
  dayOnCallEndTime: string;
  nightOnCallStartTime: string;
  nightOnCallEndTime: string;
};

export type OnCallAssignmentLike = {
  id: string;
  shiftType: ShiftType;
  pharmacistId?: string | null;
};

function isMinuteInRange(minute: number, start: number, end: number) {
  if (start < end) {
    return minute >= start && minute < end;
  }

  return minute >= start || minute < end;
}

export function resolveOnCallShiftTypeForStartTime(startTime: string, settings: OnCallSettings): ShiftType {
  const minute = minutesFromTime(startTime);
  const dayStart = minutesFromTime(settings.dayOnCallStartTime);
  const dayEnd = minutesFromTime(settings.dayOnCallEndTime);

  return isMinuteInRange(minute, dayStart, dayEnd) ? "ON_CALL_DAY" : "ON_CALL_NIGHT";
}

export function resolveAssignmentForCallStart(
  assignments: OnCallAssignmentLike[],
  startTime: string,
  settings: OnCallSettings,
) {
  const onCallAssignments = assignments.filter((assignment) => isOnCallShiftType(assignment.shiftType));

  if (onCallAssignments.length === 1) {
    return onCallAssignments[0];
  }

  const preferredShiftType = resolveOnCallShiftTypeForStartTime(startTime, settings);
  return (
    onCallAssignments.find((assignment) => assignment.shiftType === preferredShiftType) ??
    onCallAssignments.find((assignment) => assignment.shiftType === "ON_CALL_WEEKDAY") ??
    onCallAssignments.find((assignment) => assignment.shiftType === "ON_CALL_SATURDAY") ??
    null
  );
}
