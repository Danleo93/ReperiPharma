import { Download } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
import { calculatePharmacistMetrics, dateInputRange, formatMinutes, intersectDateRanges, monthDateRange, MONTH_LABELS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [calendars, pharmacists] = await Promise.all([
    prisma.calendarYear.findMany({ include: { site: true }, orderBy: [{ year: "desc" }, { site: { name: "asc" } }] }),
    prisma.pharmacist.findMany({ include: { sites: true }, orderBy: [{ active: "desc" }, { lastName: "asc" }] }),
  ]);

  const selectedCalendar = calendars.find((calendar) => calendar.id === params.calendarYearId);
  const month = params.month ? Number(params.month) : undefined;
  const calendarRange = selectedCalendar
    ? month
      ? monthDateRange(selectedCalendar.year, month)
      : { start: new Date(Date.UTC(selectedCalendar.year, 0, 1)), end: new Date(Date.UTC(selectedCalendar.year + 1, 0, 1)) }
    : undefined;
  const dateWhere = intersectDateRanges(calendarRange, dateInputRange(params.from, params.to));

  const pharmacistWhere = params.pharmacistId ? { pharmacistId: params.pharmacistId } : {};
  const calendarDayWhere = {
    ...(selectedCalendar ? { calendarYearId: selectedCalendar.id } : {}),
    ...(dateWhere
      ? {
          date: {
            ...(dateWhere.start ? { gte: dateWhere.start } : {}),
            ...(dateWhere.end ? { lt: dateWhere.end } : {}),
          },
        }
      : {}),
  };

  const [shifts, calls] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: {
        ...pharmacistWhere,
        calendarDay: calendarDayWhere,
      },
      include: {
        calendarDay: {
          include: {
            holiday: true,
          },
        },
      },
    }),
    prisma.onCallRecord.findMany({
      where: {
        ...pharmacistWhere,
        calendarDay: calendarDayWhere,
      },
    }),
  ]);

  const pharmacistIdsWithData = new Set([
    ...shifts.map((shift) => shift.pharmacistId).filter(Boolean),
    ...calls.map((call) => call.pharmacistId),
  ]);
  const visiblePharmacists = params.pharmacistId
    ? pharmacists.filter((pharmacist) => pharmacist.id === params.pharmacistId)
    : selectedCalendar
      ? pharmacists.filter(
          (pharmacist) =>
            pharmacist.sites.some((site) => site.siteId === selectedCalendar.siteId) || pharmacistIdsWithData.has(pharmacist.id),
        )
      : pharmacists;

  const metrics = calculatePharmacistMetrics(visiblePharmacists, shifts, calls);
  const chartRows = metrics.map((row) => ({
    ...row,
    callDurationHours: Math.round((row.callDurationMinutes / 60) * 10) / 10,
  }));

  const totals = metrics.reduce(
    (acc, row) => ({
      onCallShifts: acc.onCallShifts + row.onCallShifts,
      holidayScore: acc.holidayScore + row.holidayScore,
      callCount: acc.callCount + row.callCount,
      callDurationMinutes: acc.callDurationMinutes + row.callDurationMinutes,
    }),
    { onCallShifts: 0, holidayScore: 0, callCount: 0, callDurationMinutes: 0 },
  );

  const exportQuery = new URLSearchParams({
    ...(params.calendarYearId ? { calendarYearId: params.calendarYearId } : {}),
    ...(params.pharmacistId ? { pharmacistId: params.pharmacistId } : {}),
    ...(params.month ? { month: params.month } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  });

  return (
    <>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-600">Metriche su reperibilita, score festivi, rientri, sabati mattina e chiamate.</p>
      </section>

      <Card className="rounded-md">
        <CardContent className="p-4">
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_160px_160px_160px_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="calendarYearId">Calendario</Label>
              <select
                id="calendarYearId"
                name="calendarYearId"
                defaultValue={params.calendarYearId ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tutti</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.year} - {calendar.site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacistId">Farmacista</Label>
              <select
                id="pharmacistId"
                name="pharmacistId"
                defaultValue={params.pharmacistId ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tutti</option>
                {pharmacists.map((pharmacist) => (
                  <option key={pharmacist.id} value={pharmacist.id}>
                    {pharmacist.firstName} {pharmacist.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Mese</Label>
              <select
                id="month"
                name="month"
                defaultValue={params.month ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tutti</option>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Da</Label>
              <input id="from" name="from" type="date" defaultValue={params.from ?? ""} className="h-10 rounded-md border border-input px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">A</Label>
              <input id="to" name="to" type="date" defaultValue={params.to ?? ""} className="h-10 rounded-md border border-input px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="rounded-md">
                Filtra
              </Button>
              <a
                href={`/api/exports/dashboard-xlsx?${exportQuery.toString()}`}
                className={buttonVariants({ className: "rounded-md bg-teal-700 hover:bg-teal-800" })}
              >
                  <Download className="size-4" />
                  XLSX
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Reperibilita" value={totals.onCallShifts} />
        <SummaryCard title="Score festivi" value={totals.holidayScore.toFixed(1)} />
        <SummaryCard title="Chiamate" value={totals.callCount} />
        <SummaryCard title="Durata chiamate" value={formatMinutes(totals.callDurationMinutes)} />
      </div>

      <DashboardCharts rows={chartRows} />

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Riepilogo farmacisti</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmacista</TableHead>
                <TableHead>Reperibilita</TableHead>
                <TableHead>Score festivi</TableHead>
                <TableHead>Sabati mattina</TableHead>
                <TableHead>Pomeriggi venerdi</TableHead>
                <TableHead>Chiamate</TableHead>
                <TableHead>Durata chiamate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((row) => (
                <TableRow key={row.pharmacistId}>
                  <TableCell className="font-medium">{row.pharmacist}</TableCell>
                  <TableCell>{row.onCallShifts}</TableCell>
                  <TableCell>{row.holidayScore.toFixed(2)}</TableCell>
                  <TableCell>{row.saturdayMornings}</TableCell>
                  <TableCell>{row.fridayAfternoons}</TableCell>
                  <TableCell>{row.callCount}</TableCell>
                  <TableCell>{formatMinutes(row.callDurationMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
