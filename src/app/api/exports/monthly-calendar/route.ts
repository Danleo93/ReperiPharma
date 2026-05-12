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

  if (!calendarYearId) {
    return new Response("calendarYearId mancante", { status: 400 });
  }

  const calendar = await prisma.calendarYear.findUniqueOrThrow({
    where: { id: calendarYearId },
    include: { site: true },
  });
  const { start, end } = monthDateRange(calendar.year, month);
  const days = await prisma.calendarDay.findMany({
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
  });

  const counts = calculateMonthlyOnCallCounts(days.flatMap((day) => day.assignments));
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("ReperiPharma", 14, 14);
  doc.setFontSize(11);
  doc.text(`${calendar.site.name} - ${MONTH_LABELS[month - 1]} ${calendar.year}`, 14, 22);

  const leadingBlanks = days.length ? (days[0].dayOfWeek + 6) % 7 : 0;
  const cells = [
    ...Array.from({ length: leadingBlanks }).map(() => ""),
    ...days.map((day) => {
      const shifts = day.assignments
        .map((assignment) => {
          const pharmacist = assignment.pharmacist?.initials ?? "Scoperto";
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
    startY: 30,
    head: [["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]],
    body: rows,
    styles: { fontSize: 7, cellPadding: 1.6, valign: "top", minCellHeight: 23 },
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
    body: [
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
