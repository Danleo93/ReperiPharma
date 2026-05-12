export function makeUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return makeUtcDate(year, month, day);
}

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getUtcDayOfWeek(date: Date) {
  return date.getUTCDay();
}

export function getDatesInYear(year: number) {
  const dates: Date[] = [];
  let current = makeUtcDate(year, 1, 1);

  while (current.getUTCFullYear() === year) {
    dates.push(current);
    current = addUtcDays(current, 1);
  }

  return dates;
}

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isSameUtcDate(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

export function monthDateRange(year: number, month: number) {
  const start = makeUtcDate(year, month, 1);
  const end = month === 12 ? makeUtcDate(year + 1, 1, 1) : makeUtcDate(year, month + 1, 1);
  return { start, end };
}

export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function durationMinutes(startTime: string, endTime: string) {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  return end >= start ? end - start : 24 * 60 - start + end;
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining.toString().padStart(2, "0")}m`;
}
