import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import {
  DAY_TYPE_LABELS,
  MONTH_LABELS,
  SHIFT_FRAMEWORK_LABELS,
  SHIFT_TYPE_LABELS,
  WEEKDAY_LABELS,
  calculateHolidayScoreDistribution,
  calculatePharmacistMetrics,
  durationMinutes,
  formatMinutes,
  monthDateRange,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const calendarYearId = params.get("calendarYearId") ?? undefined;
  const pharmacistId = params.get("pharmacistId") ?? undefined;
  const month = params.get("month") ? Number(params.get("month")) : undefined;

  const selectedCalendar = calendarYearId
    ? await prisma.calendarYear.findUnique({ where: { id: calendarYearId }, include: { site: true } })
    : null;

  const dateRange = selectedCalendar
    ? month
      ? monthDateRange(selectedCalendar.year, month)
      : { start: new Date(Date.UTC(selectedCalendar.year, 0, 1)), end: new Date(Date.UTC(selectedCalendar.year + 1, 0, 1)) }
    : undefined;

  const calendarDayWhere = {
    ...(calendarYearId ? { calendarYearId } : {}),
    ...(dateRange ? { date: { gte: dateRange.start, lt: dateRange.end } } : {}),
  };

  const [pharmacists, shifts, calls, holidays] = await Promise.all([
    prisma.pharmacist.findMany({ orderBy: { lastName: "asc" } }),
    prisma.shiftAssignment.findMany({
      where: {
        ...(pharmacistId ? { pharmacistId } : {}),
        calendarDay: calendarDayWhere,
      },
      include: {
        site: true,
        pharmacist: true,
        calendarDay: {
          include: { holiday: true, calendarYear: { include: { site: true } } },
        },
      },
      orderBy: [{ calendarDay: { date: "asc" } }],
    }),
    prisma.onCallRecord.findMany({
      where: {
        ...(pharmacistId ? { pharmacistId } : {}),
        calendarDay: calendarDayWhere,
      },
      include: { pharmacist: true, site: true, calendarDay: true },
      orderBy: [{ calendarDay: { date: "asc" } }, { startTime: "asc" }],
    }),
    prisma.holiday.findMany({
      where: dateRange ? { date: { gte: dateRange.start, lt: dateRange.end } } : {},
      include: { site: true, calendarDays: { include: { assignments: { include: { pharmacist: true } } } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const visiblePharmacists = pharmacistId ? pharmacists.filter((pharmacist) => pharmacist.id === pharmacistId) : pharmacists;
  const metrics = calculatePharmacistMetrics(visiblePharmacists, shifts, calls);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ReperiPharma";
  workbook.created = new Date();

  const aggregate = workbook.addWorksheet("Aggregato");
  addHeader(aggregate, [
    "farmacista",
    "presidio",
    "periodo",
    "numero reperibilita",
    "score festivi",
    "numero sabati mattina",
    "numero pomeriggi del venerdi",
    "numero chiamate",
    "durata totale chiamate",
  ]);
  for (const row of metrics) {
    aggregate.addRow([
      row.pharmacist,
      selectedCalendar?.site.name ?? "Tutti",
      selectedCalendar ? `${selectedCalendar.year}${month ? `-${month}` : ""}` : "Tutto",
      row.onCallShifts,
      row.holidayScore,
      row.saturdayMornings,
      row.fridayAfternoons,
      row.callCount,
      formatMinutes(row.callDurationMinutes),
    ]);
  }

  const perMonth = workbook.addWorksheet("Per mese");
  addHeader(perMonth, [
    "anno",
    "mese",
    "presidio",
    "farmacista",
    "numero reperibilita",
    "score festivi",
    "numero sabati mattina",
    "numero pomeriggi del venerdi",
    "numero chiamate",
    "durata totale chiamate",
  ]);
  const months = new Set(shifts.map((shift) => `${shift.calendarDay.date.getUTCFullYear()}-${shift.calendarDay.date.getUTCMonth() + 1}`));
  for (const key of months) {
    const [year, monthValue] = key.split("-").map(Number);
    const monthShifts = shifts.filter(
      (shift) => shift.calendarDay.date.getUTCFullYear() === year && shift.calendarDay.date.getUTCMonth() + 1 === monthValue,
    );
    const monthCalls = calls.filter(
      (call) => call.calendarDay.date.getUTCFullYear() === year && call.calendarDay.date.getUTCMonth() + 1 === monthValue,
    );
    const monthMetrics = calculatePharmacistMetrics(visiblePharmacists, monthShifts, monthCalls);
    for (const row of monthMetrics) {
      perMonth.addRow([
        year,
        MONTH_LABELS[monthValue - 1],
        selectedCalendar?.site.name ?? "Tutti",
        row.pharmacist,
        row.onCallShifts,
        row.holidayScore,
        row.saturdayMornings,
        row.fridayAfternoons,
        row.callCount,
        formatMinutes(row.callDurationMinutes),
      ]);
    }
  }

  const perPharmacist = workbook.addWorksheet("Per farmacista");
  addHeader(perPharmacist, ["farmacista", "iniziali", "colore", "attivo", "reperibilita", "score festivi", "chiamate", "durata chiamate"]);
  for (const row of metrics) {
    const pharmacist = visiblePharmacists.find((item) => item.id === row.pharmacistId);
    perPharmacist.addRow([
      row.pharmacist,
      row.initials,
      row.color,
      pharmacist?.active ? "si" : "no",
      row.onCallShifts,
      row.holidayScore,
      row.callCount,
      formatMinutes(row.callDurationMinutes),
    ]);
  }

  const callsSheet = workbook.addWorksheet("Chiamate");
  addHeader(callsSheet, ["data", "ora inizio", "ora fine", "durata", "farmacista", "presidio", "reparto", "medico", "note"]);
  for (const call of calls) {
    callsSheet.addRow([
      call.calendarDay.date.toISOString().slice(0, 10),
      call.startTime,
      call.endTime,
      formatMinutes(durationMinutes(call.startTime, call.endTime)),
      `${call.pharmacist.firstName} ${call.pharmacist.lastName}`,
      call.site.name,
      call.department,
      call.physician,
      call.notes ?? "",
    ]);
  }

  const holidaysSheet = workbook.addWorksheet("Festivi");
  addHeader(holidaysSheet, ["data", "nome", "tipo", "presidio", "score", "framework", "assegnazioni reperibilita", "score attribuito per farmacista"]);
  for (const holiday of holidays) {
    const assignments = holiday.calendarDays.flatMap((day) => day.assignments);
    const distribution = calculateHolidayScoreDistribution(holiday.score, assignments);
    holidaysSheet.addRow([
      holiday.date.toISOString().slice(0, 10),
      holiday.name,
      holiday.type,
      holiday.site?.name ?? "Tutti",
      holiday.score,
      SHIFT_FRAMEWORK_LABELS[holiday.defaultShiftFramework],
      assignments
        .map((assignment) => `${SHIFT_TYPE_LABELS[assignment.shiftType]}: ${assignment.pharmacist?.initials ?? "Scoperto"}`)
        .join("; "),
      distribution
        .map((item) => {
          const assignment = assignments.find((candidate) => candidate.id === item.assignmentId);
          return `${assignment?.pharmacist?.initials ?? "Scoperto"} ${item.score}`;
        })
        .join("; "),
    ]);
  }

  const raw = workbook.addWorksheet("Turni grezzi");
  addHeader(raw, ["data", "giorno settimana", "presidio", "tipo giorno", "framework", "tipo turno", "farmacista", "iniziali", "note"]);
  for (const shift of shifts) {
    raw.addRow([
      shift.calendarDay.date.toISOString().slice(0, 10),
      WEEKDAY_LABELS[shift.calendarDay.dayOfWeek],
      shift.site.name,
      DAY_TYPE_LABELS[shift.calendarDay.dayType],
      SHIFT_FRAMEWORK_LABELS[shift.calendarDay.shiftFramework],
      SHIFT_TYPE_LABELS[shift.shiftType],
      shift.pharmacist ? `${shift.pharmacist.firstName} ${shift.pharmacist.lastName}` : "Scoperto",
      shift.pharmacist?.initials ?? "",
      shift.notes ?? "",
    ]);
  }

  for (const worksheet of workbook.worksheets) {
    worksheet.columns.forEach((_, index) => {
      const column = worksheet.getColumn(index + 1);
      let maxLength = 14;
      column.eachCell((cell) => {
        maxLength = Math.max(maxLength, String(cell.value ?? "").length);
      });
      column.width = Math.min(34, maxLength + 2);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"reperipharma-dashboard.xlsx\"",
    },
  });
}

function addHeader(worksheet: ExcelJS.Worksheet, labels: string[]) {
  const row = worksheet.addRow(labels);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
}
