import { z } from "zod";
import { CALENDAR_STATUSES, HOLIDAY_TYPES, SHIFT_FRAMEWORKS } from "@/lib/domain";

export const calendarYearSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  siteId: z.string().min(1, "Seleziona un presidio."),
});

export const calendarStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CALENDAR_STATUSES),
});

export const pharmacistSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1, "Nome obbligatorio."),
  lastName: z.string().trim().min(1, "Cognome obbligatorio."),
  initials: z.string().trim().max(4).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Colore HEX non valido."),
  siteIds: z.array(z.string()).default([]),
});

export const siteSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome presidio obbligatorio."),
});

export const assignmentSchema = z.object({
  id: z.string().min(1),
  pharmacistId: z.string().optional(),
});

export const onCallRecordSchema = z.object({
  id: z.string().optional(),
  calendarDayId: z.string().min(1),
  siteId: z.string().min(1),
  pharmacistId: z.string().min(1, "Seleziona un farmacista."),
  shiftAssignmentId: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  department: z.string().trim().min(1, "Reparto obbligatorio."),
  physician: z.string().trim().min(1, "Medico obbligatorio."),
  notes: z.string().optional(),
});

export const holidaySchema = z.object({
  id: z.string().optional(),
  date: z.coerce.date(),
  name: z.string().trim().min(1, "Nome festivo obbligatorio."),
  score: z.coerce.number().min(0),
  type: z.enum(HOLIDAY_TYPES).default("MANUAL"),
  siteId: z.string().optional(),
  defaultShiftFramework: z.enum(SHIFT_FRAMEWORKS),
  confirmOverwrite: z.coerce.boolean().optional(),
});

export const settingsSchema = z.object({
  id: z.string().optional(),
  dayOnCallStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  dayOnCallEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  nightOnCallStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  nightOnCallEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  holidayScoreMode: z.literal("SPLIT_BETWEEN_ON_CALL_SHIFTS"),
});
