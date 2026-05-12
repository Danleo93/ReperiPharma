import { Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MonthlyCalendarView } from "@/components/calendar/monthly-calendar-view";
import { prisma } from "@/lib/db/prisma";
import { MONTH_LABELS, monthDateRange } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function CalendarioMensilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const month = params.month ? Number(params.month) : new Date().getMonth() + 1;

  const [calendars, pharmacists, settings] = await Promise.all([
    prisma.calendarYear.findMany({
      include: { site: true },
      orderBy: [{ year: "desc" }, { site: { name: "asc" } }],
    }),
    prisma.pharmacist.findMany({
      include: { sites: true },
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.settings.findFirst(),
  ]);

  const selectedCalendar = calendars.find((calendar) => calendar.id === params.calendarYearId) ?? calendars[0];

  if (!selectedCalendar) {
    return (
      <>
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario mensile</h1>
          <p className="text-sm text-slate-600">Crea prima un calendario annuale per visualizzare i mesi.</p>
        </section>
        <Card className="rounded-md">
          <CardContent className="p-8 text-center text-slate-500">Nessun calendario annuale disponibile.</CardContent>
        </Card>
      </>
    );
  }

  const { start, end } = monthDateRange(selectedCalendar.year, month);
  const days = await prisma.calendarDay.findMany({
    where: {
      calendarYearId: selectedCalendar.id,
      date: { gte: start, lt: end },
    },
    include: {
      holiday: true,
      assignments: {
        include: { pharmacist: true },
        orderBy: { createdAt: "asc" },
      },
      onCallRecords: {
        include: { pharmacist: true },
        orderBy: { startTime: "asc" },
      },
      _count: {
        select: { onCallRecords: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const sitePharmacists = pharmacists.filter((pharmacist) =>
    pharmacist.sites.some((site) => site.siteId === selectedCalendar.siteId),
  );
  const activePharmacists = sitePharmacists.filter((pharmacist) => pharmacist.active);

  return (
    <>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Calendario mensile</h1>
        <p className="text-sm text-slate-600">
          Vista centrale dei turni, con assegnazioni rapide, chiamate e conteggi mese.
        </p>
      </section>

      <Card className="rounded-md">
        <CardContent className="p-4">
          <form className="grid gap-4 md:grid-cols-[1.5fr_180px_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="calendarYearId">Calendario annuale</Label>
              <select
                id="calendarYearId"
                name="calendarYearId"
                defaultValue={selectedCalendar.id}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.year} - {calendar.site.name} ({calendar.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Mese</Label>
              <select
                id="month"
                name="month"
                defaultValue={month}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
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
                {sitePharmacists.map((pharmacist) => (
                  <option key={pharmacist.id} value={pharmacist.id}>
                    {pharmacist.firstName} {pharmacist.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="rounded-md">
                Filtra
              </Button>
              <a
                href={`/api/exports/monthly-calendar?calendarYearId=${selectedCalendar.id}&month=${month}`}
                className={buttonVariants({ className: "rounded-md bg-teal-700 hover:bg-teal-800" })}
              >
                  <Download className="size-4" />
                  PDF
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <MonthlyCalendarView
        days={days.map((day) => ({
          id: day.id,
          date: day.date.toISOString().slice(0, 10),
          dayOfMonth: day.date.getUTCDate(),
          dayOfWeek: day.dayOfWeek,
          dayType: day.dayType,
          shiftFramework: day.shiftFramework,
          holiday: day.holiday ? { name: day.holiday.name, score: day.holiday.score } : null,
          callCount: day._count.onCallRecords,
          calls: day.onCallRecords.map((call) => ({
            id: call.id,
            startTime: call.startTime,
            endTime: call.endTime,
            department: call.department,
            physician: call.physician,
            notes: call.notes,
            pharmacist: {
              id: call.pharmacist.id,
              firstName: call.pharmacist.firstName,
              lastName: call.pharmacist.lastName,
              initials: call.pharmacist.initials,
              color: call.pharmacist.color,
              active: call.pharmacist.active,
            },
          })),
          assignments: day.assignments.map((assignment) => ({
            id: assignment.id,
            shiftType: assignment.shiftType,
            pharmacistId: assignment.pharmacistId,
            pharmacist: assignment.pharmacist
              ? {
                  id: assignment.pharmacist.id,
                  firstName: assignment.pharmacist.firstName,
                  lastName: assignment.pharmacist.lastName,
                  initials: assignment.pharmacist.initials,
                  color: assignment.pharmacist.color,
                  active: assignment.pharmacist.active,
                }
              : null,
          })),
        }))}
        pharmacists={activePharmacists.map((pharmacist) => ({
          id: pharmacist.id,
          firstName: pharmacist.firstName,
          lastName: pharmacist.lastName,
          initials: pharmacist.initials,
          color: pharmacist.color,
          active: pharmacist.active,
        }))}
        siteId={selectedCalendar.siteId}
        siteName={selectedCalendar.site.name}
        month={month}
        year={selectedCalendar.year}
        settings={
          settings ?? {
            dayOnCallStartTime: "08:00",
            dayOnCallEndTime: "20:00",
            nightOnCallStartTime: "20:00",
            nightOnCallEndTime: "08:00",
          }
        }
        readOnly={selectedCalendar.status === "CLOSED"}
      />
    </>
  );
}
