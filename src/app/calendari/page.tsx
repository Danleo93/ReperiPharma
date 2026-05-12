import Link from "next/link";
import { CalendarPlus, ExternalLink, Lock, RotateCcw, Trash2, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createCalendarYearAction,
  deleteCalendarYearAction,
  updateCalendarStatusAction,
} from "@/lib/actions/calendar-actions";
import { prisma } from "@/lib/db/prisma";
import { CALENDAR_STATUSES } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function CalendariPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const yearFilter = params.year ? Number(params.year) : undefined;
  const siteFilter = params.siteId || undefined;
  const statusFilter = params.status || undefined;

  const [sites, calendars] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.calendarYear.findMany({
      where: {
        year: yearFilter,
        siteId: siteFilter,
        status: statusFilter as never,
      },
      include: {
        site: true,
        _count: { select: { days: true } },
      },
      orderBy: [{ year: "desc" }, { site: { name: "asc" } }],
    }),
  ]);

  return (
    <>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Calendari annuali</h1>
        <p className="text-sm text-slate-600">
          Crea un calendario per anno e presidio: giorni, festivi nazionali e slot turno vengono generati automaticamente.
        </p>
      </section>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Nuovo calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCalendarYearAction} className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="year">Anno</Label>
              <Input id="year" name="year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteId">Presidio</Label>
              <select
                id="siteId"
                name="siteId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Seleziona presidio</option>
                {sites
                  .filter((site) => site.active)
                  .map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800">
              <CalendarPlus className="size-4" />
              Genera calendario
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4 md:items-end">
            <div className="space-y-2">
              <Label htmlFor="filter-year">Anno</Label>
              <Input id="filter-year" name="year" type="number" min="2020" max="2100" defaultValue={params.year ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-site">Presidio</Label>
              <select
                id="filter-site"
                name="siteId"
                defaultValue={params.siteId ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tutti</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Stato</Label>
              <select
                id="filter-status"
                name="status"
                defaultValue={params.status ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tutti</option>
                {CALENDAR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" className="rounded-md">
              Applica filtri
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anno</TableHead>
                <TableHead>Presidio</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Giorni</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-slate-500">
                    Nessun calendario trovato.
                  </TableCell>
                </TableRow>
              )}
              {calendars.map((calendar) => (
                <TableRow key={calendar.id}>
                  <TableCell className="font-medium">{calendar.year}</TableCell>
                  <TableCell>{calendar.site.name}</TableCell>
                  <TableCell>
                    <Badge variant={calendar.status === "CLOSED" ? "secondary" : "default"} className="rounded-md">
                      {calendar.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{calendar._count.days}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/calendario-mensile?calendarYearId=${calendar.id}&month=1`}
                        className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-md" })}
                      >
                          <ExternalLink className="size-4" />
                          Apri
                      </Link>
                      {calendar.status === "CLOSED" ? (
                        <form action={updateCalendarStatusAction}>
                          <input type="hidden" name="id" value={calendar.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <Button type="submit" size="sm" variant="outline" className="rounded-md">
                            <Unlock className="size-4" />
                            Riapri
                          </Button>
                        </form>
                      ) : (
                        <form action={updateCalendarStatusAction}>
                          <input type="hidden" name="id" value={calendar.id} />
                          <input type="hidden" name="status" value="CLOSED" />
                          <Button type="submit" size="sm" variant="outline" className="rounded-md">
                            <Lock className="size-4" />
                            Chiudi
                          </Button>
                        </form>
                      )}
                      <form action={updateCalendarStatusAction}>
                        <input type="hidden" name="id" value={calendar.id} />
                        <input type="hidden" name="status" value="DRAFT" />
                        <Button type="submit" size="icon" variant="ghost" className="rounded-md" aria-label="Porta in bozza">
                          <RotateCcw className="size-4" />
                        </Button>
                      </form>
                      <form action={deleteCalendarYearAction}>
                        <input type="hidden" name="id" value={calendar.id} />
                        <Button type="submit" size="icon" variant="ghost" className="rounded-md text-red-700" aria-label="Elimina calendario">
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
