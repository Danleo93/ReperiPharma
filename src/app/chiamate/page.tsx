import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteOnCallRecordAction, upsertOnCallRecordAction } from "@/lib/actions/call-actions";
import { prisma } from "@/lib/db/prisma";
import { durationMinutes, formatMinutes, monthDateRange } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ChiamatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [calendars, pharmacists] = await Promise.all([
    prisma.calendarYear.findMany({ include: { site: true }, orderBy: [{ year: "desc" }, { site: { name: "asc" } }] }),
    prisma.pharmacist.findMany({ include: { sites: true }, orderBy: [{ active: "desc" }, { lastName: "asc" }] }),
  ]);
  const selectedCalendar = calendars.find((calendar) => calendar.id === params.calendarYearId) ?? calendars[0];
  const sitePharmacists = selectedCalendar
    ? pharmacists.filter((pharmacist) => pharmacist.sites.some((site) => site.siteId === selectedCalendar.siteId))
    : pharmacists;

  const days = selectedCalendar
    ? await prisma.calendarDay.findMany({
        where: { calendarYearId: selectedCalendar.id },
        orderBy: { date: "asc" },
      })
    : [];

  const dateWhere =
    params.from && params.to
      ? { date: { gte: new Date(params.from), lt: new Date(params.to) } }
      : selectedCalendar
        ? { date: { gte: monthDateRange(selectedCalendar.year, 1).start, lt: new Date(Date.UTC(selectedCalendar.year + 1, 0, 1)) } }
        : {};

  const calls = await prisma.onCallRecord.findMany({
    where: {
      ...(params.pharmacistId ? { pharmacistId: params.pharmacistId } : {}),
      ...(params.department ? { department: { contains: params.department, mode: "insensitive" as const } } : {}),
      ...(selectedCalendar ? { calendarDay: { calendarYearId: selectedCalendar.id, ...dateWhere } } : {}),
    },
    include: {
      pharmacist: true,
      site: true,
      calendarDay: true,
      shiftAssignment: true,
    },
    orderBy: [{ calendarDay: { date: "asc" } }, { startTime: "asc" }],
  });

  return (
    <>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Chiamate</h1>
        <p className="text-sm text-slate-600">Registro cronologico delle chiamate di reperibilita.</p>
      </section>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_160px_160px_auto] lg:items-end">
            <Field label="Calendario" id="calendarYearId">
              <select name="calendarYearId" id="calendarYearId" defaultValue={selectedCalendar?.id ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.year} - {calendar.site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Farmacista" id="pharmacistId">
              <select name="pharmacistId" id="pharmacistId" defaultValue={params.pharmacistId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Tutti</option>
                {sitePharmacists.map((pharmacist) => (
                  <option key={pharmacist.id} value={pharmacist.id}>
                    {pharmacist.firstName} {pharmacist.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reparto" id="department">
              <input id="department" name="department" defaultValue={params.department ?? ""} className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Field label="Da" id="from">
              <input id="from" name="from" type="date" defaultValue={params.from ?? ""} className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Field label="A" id="to">
              <input id="to" name="to" type="date" defaultValue={params.to ?? ""} className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Button type="submit" variant="outline" className="rounded-md">
              Filtra
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedCalendar && (
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Nuova chiamata</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={upsertOnCallRecordAction} className="grid gap-4 lg:grid-cols-4 lg:items-end">
              <input type="hidden" name="siteId" value={selectedCalendar.siteId} />
              <Field label="Data" id="calendarDayId">
                <select name="calendarDayId" id="calendarDayId" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.date.toISOString().slice(0, 10)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Farmacista" id="create-pharmacistId">
                <select name="pharmacistId" id="create-pharmacistId" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Seleziona</option>
                  {sitePharmacists
                    .filter((pharmacist) => pharmacist.active)
                    .map((pharmacist) => (
                      <option key={pharmacist.id} value={pharmacist.id}>
                        {pharmacist.firstName} {pharmacist.lastName}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Ora inizio" id="startTime">
                <input id="startTime" name="startTime" type="time" defaultValue="08:00" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
              </Field>
              <Field label="Ora fine" id="endTime">
                <input id="endTime" name="endTime" type="time" defaultValue="08:30" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
              </Field>
              <Field label="Reparto" id="create-department">
                <input id="create-department" name="department" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
              </Field>
              <Field label="Medico" id="physician">
                <input id="physician" name="physician" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
              </Field>
              <Field label="Note" id="notes">
                <input id="notes" name="notes" className="h-10 w-full rounded-md border border-input px-3 text-sm" />
              </Field>
              <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800">
                <Plus className="size-4" />
                Registra
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ora</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Farmacista</TableHead>
                <TableHead>Presidio</TableHead>
                <TableHead>Reparto</TableHead>
                <TableHead>Medico</TableHead>
                <TableHead>Note</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center text-slate-500">
                    Nessuna chiamata registrata.
                  </TableCell>
                </TableRow>
              )}
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>{call.calendarDay.date.toISOString().slice(0, 10)}</TableCell>
                  <TableCell>
                    {call.startTime} - {call.endTime}
                  </TableCell>
                  <TableCell>{formatMinutes(durationMinutes(call.startTime, call.endTime))}</TableCell>
                  <TableCell>{call.pharmacist.firstName} {call.pharmacist.lastName}</TableCell>
                  <TableCell>{call.site.name}</TableCell>
                  <TableCell>{call.department}</TableCell>
                  <TableCell>{call.physician}</TableCell>
                  <TableCell className="max-w-52 truncate">{call.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <details className="relative">
                        <summary className="cursor-pointer rounded-md border px-2 py-1 text-xs">Modifica</summary>
                        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-slate-200 bg-white p-3 text-left shadow-lg">
                          <form action={upsertOnCallRecordAction} className="space-y-2">
                            <input type="hidden" name="id" value={call.id} />
                            <input type="hidden" name="calendarDayId" value={call.calendarDayId} />
                            <input type="hidden" name="siteId" value={call.siteId} />
                            <input type="hidden" name="shiftAssignmentId" value={call.shiftAssignmentId ?? ""} />
                            <input name="startTime" type="time" defaultValue={call.startTime} className="h-9 w-full rounded-md border px-2 text-sm" />
                            <input name="endTime" type="time" defaultValue={call.endTime} className="h-9 w-full rounded-md border px-2 text-sm" />
                            <select name="pharmacistId" defaultValue={call.pharmacistId} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                              {sitePharmacists.map((pharmacist) => (
                                <option key={pharmacist.id} value={pharmacist.id}>
                                  {pharmacist.firstName} {pharmacist.lastName}
                                </option>
                              ))}
                            </select>
                            <input name="department" defaultValue={call.department} className="h-9 w-full rounded-md border px-2 text-sm" />
                            <input name="physician" defaultValue={call.physician} className="h-9 w-full rounded-md border px-2 text-sm" />
                            <input name="notes" defaultValue={call.notes ?? ""} className="h-9 w-full rounded-md border px-2 text-sm" />
                            <Button type="submit" size="sm" className="w-full rounded-md bg-teal-700 hover:bg-teal-800">
                              Salva
                            </Button>
                          </form>
                        </div>
                      </details>
                      <form action={deleteOnCallRecordAction}>
                        <input type="hidden" name="id" value={call.id} />
                        <Button type="submit" size="icon" variant="ghost" className="rounded-md text-red-700" aria-label="Elimina chiamata">
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
