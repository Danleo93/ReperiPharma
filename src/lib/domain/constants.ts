export const CALENDAR_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export const HOLIDAY_TYPES = ["NATIONAL", "LOCAL", "COMPANY", "MANUAL"] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export const SHIFT_FRAMEWORKS = [
  "WEEKDAY_AFTERNOON_ONCALL",
  "SATURDAY_MORNING_ONCALL",
  "DOUBLE_ONCALL_DAY_NIGHT",
  "CUSTOM",
] as const;
export type ShiftFramework = (typeof SHIFT_FRAMEWORKS)[number];

export const DAY_TYPES = [
  "WEEKDAY",
  "SATURDAY",
  "SUNDAY",
  "NATIONAL_HOLIDAY",
  "MANUAL_HOLIDAY",
  "LOCAL_HOLIDAY",
  "COMPANY_HOLIDAY",
] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const SHIFT_TYPES = [
  "AFTERNOON",
  "ON_CALL_WEEKDAY",
  "SATURDAY_MORNING",
  "ON_CALL_SATURDAY",
  "ON_CALL_DAY",
  "ON_CALL_NIGHT",
  "MORNING",
  "CUSTOM",
] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const ON_CALL_SHIFT_TYPES: ShiftType[] = [
  "ON_CALL_WEEKDAY",
  "ON_CALL_SATURDAY",
  "ON_CALL_DAY",
  "ON_CALL_NIGHT",
  "CUSTOM",
];

export const WEEKDAY_LABELS = [
  "Domenica",
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
] as const;

export const MONTH_LABELS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  AFTERNOON: "Pom",
  ON_CALL_WEEKDAY: "Rep",
  SATURDAY_MORNING: "Matt",
  ON_CALL_SATURDAY: "Rep",
  ON_CALL_DAY: "Rep D",
  ON_CALL_NIGHT: "Rep N",
  MORNING: "Matt",
  CUSTOM: "Custom",
};

export const SHIFT_FRAMEWORK_LABELS: Record<ShiftFramework, string> = {
  WEEKDAY_AFTERNOON_ONCALL: "Pomeriggio + reperibilita",
  SATURDAY_MORNING_ONCALL: "Mattina + reperibilita",
  DOUBLE_ONCALL_DAY_NIGHT: "Doppia reperibilita",
  CUSTOM: "Personalizzato",
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  WEEKDAY: "Feriale",
  SATURDAY: "Sabato",
  SUNDAY: "Domenica",
  NATIONAL_HOLIDAY: "Festivo nazionale",
  MANUAL_HOLIDAY: "Festivo manuale",
  LOCAL_HOLIDAY: "Festivo locale",
  COMPANY_HOLIDAY: "Festivo aziendale",
};
