import { NextRequest } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/db/prisma";
import {
  DAY_TYPE_LABELS,
  MONTH_LABELS,
  SHIFT_TYPE_LABELS,
  calculateMonthlyOnCallCounts,
  monthDateRange,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const calendarYearId = request.nextUrl.searchParams.get("calendarYearId");
  const month = Number(request.nextUrl.searchParams.get("month") ?? "1");
  const pharmacistId = request.nextUrl.searchParams.get("pharmacistId");

  if (!calendarYearId) {
    return new Response("calendarYearId mancante", { status: 400 });
  }

  const calendar = await prisma.calendarYear.findUniqueOrThrow({
    where: { id: calendarYearId },
    include: { site: true },
  });
  const { start, end } = monthDateRange(calendar.year, month);
  const [days, selectedPharmacist] = await Promise.all([
    prisma.calendarDay.findMany({
      where: {
        calendarYearId,
        date: { gte: start, lt: end },
      },
      include: {
        holiday: true,
        assignments: {
          include: { pharmacist: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { date: "asc" },
    }),
    pharmacistId ? prisma.pharmacist.findUnique({ where: { id: pharmacistId } }) : Promise.resolve(null),
  ]);
  const visibleDays = days.map((day) => ({
    ...day,
    assignments: pharmacistId
      ? day.assignments.filter((assignment) => assignment.pharmacistId === pharmacistId)
      : day.assignments,
  }));

  const counts = calculateMonthlyOnCallCounts(visibleDays.flatMap((day) => day.assignments));
  const totalVisibleShifts = visibleDays.reduce((total, day) => total + day.assignments.length, 0);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("ReperiPharma", 14, 14);
  doc.setFontSize(11);
  doc.text(`${calendar.site.name} - ${MONTH_LABELS[month - 1]} ${calendar.year}`, 14, 22);
  if (selectedPharmacist) {
    doc.text(`Farmacista: ${selectedPharmacist.firstName} ${selectedPharmacist.lastName}`, 14, 28);
  }

  const leadingBlanks = visibleDays.length ? (visibleDays[0].dayOfWeek + 6) % 7 : 0;
  const cells = [
    ...Array.from({ length: leadingBlanks }).map(() => ""),
    ...visibleDays.map((day) => {
      const shifts = day.assignments
        .map((assignment) => {
          const pharmacist = assignment.pharmacist
            ? `${assignment.pharmacist.firstName} ${assignment.pharmacist.lastName}`
            : "Scoperto";
          return `${SHIFT_TYPE_LABELS[assignment.shiftType]}: ${pharmacist}`;
        })
        .join("\n");
      const holiday = day.holiday ? `\n${day.holiday.name}` : "";
      return `${day.date.getUTCDate()} - ${DAY_TYPE_LABELS[day.dayType]}${holiday}\n${shifts}`;
    }),
  ];
  const rows = [];
  while (cells.length) {
    rows.push(cells.splice(0, 7));
  }

  autoTable(doc, {
    startY: selectedPharmacist ? 34 : 30,
    head: [["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]],
    body: rows,
    styles: { fontSize: 6.5, cellPadding: 1.4, overflow: "linebreak", valign: "top", minCellHeight: 23 },
    headStyles: { fillColor: [15, 118, 110] },
    columnStyles: {
      5: { fillColor: [236, 254, 255] },
      6: { fillColor: [255, 241, 242] },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  autoTable(doc, {
    startY: finalY + 6,
    head: [["Statistica", "Valore"]],
    body: selectedPharmacist
      ? [
          ["Farmacista", `${selectedPharmacist.firstName} ${selectedPharmacist.lastName}`],
          ["Turni reperibilita", counts.assigned],
          ["Turni totali", totalVisibleShifts],
        ]
      : [
          ["Turni reperibilita assegnabili", counts.assignable],
          ["Turni reperibilita assegnati", counts.assigned],
          ["Turni reperibilita scoperti", counts.uncovered],
          ...counts.byPharmacist.map((item) => [`${item.pharmacist} (${item.initials})`, item.count]),
        ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: 14, right: 180 },
  });

  autoTable(doc, {
    startY: finalY + 6,
    head: [["Legenda", "Descrizione"]],
    body: Object.entries(SHIFT_TYPE_LABELS).map(([key, label]) => [label, key]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 170, right: 14 },
  });

  const bytes = Buffer.from(doc.output("arraybuffer"));
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reperipharma-${calendar.site.name}-${calendar.year}-${month}.pdf"`,
    },
  });
}
