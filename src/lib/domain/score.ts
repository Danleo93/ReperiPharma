import type { ShiftType } from "./constants";

export type ScoreAssignment = {
  id: string;
  shiftType: ShiftType;
  pharmacistId?: string | null;
};

export type ScoreResult = {
  assignmentId: string;
  pharmacistId: string | null;
  score: number;
};

export function isOnCallShiftType(shiftType: ShiftType) {
  return (
    shiftType === "ON_CALL_WEEKDAY" ||
    shiftType === "ON_CALL_SATURDAY" ||
    shiftType === "ON_CALL_DAY" ||
    shiftType === "ON_CALL_NIGHT" ||
    shiftType === "CUSTOM"
  );
}

export function calculateHolidayScoreDistribution(score: number, assignments: ScoreAssignment[]): ScoreResult[] {
  const onCallAssignments = assignments.filter((assignment) => isOnCallShiftType(assignment.shiftType));

  if (onCallAssignments.length === 0) {
    return [];
  }

  const value = score / onCallAssignments.length;

  return onCallAssignments.map((assignment) => ({
    assignmentId: assignment.id,
    pharmacistId: assignment.pharmacistId ?? null,
    score: value,
  }));
}
