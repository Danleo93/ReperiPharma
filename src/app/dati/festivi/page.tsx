import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { upsertHolidayAction } from "@/lib/actions/data-actions";
import { prisma } from "@/lib/db/prisma";
import { SHIFT_FRAMEWORK_LABELS, SHIFT_FRAMEWORKS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function FestiviPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const year = params.year ? Number(params.year) : new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [sites, holidays] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.holiday.findMany({
      where: { date: { gte: start, lt: end } },
      include: { site: true },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Festivi</h1>
        <p className="text-sm text-slate-600">
          Festivita nazionali, locali, aziendali e manuali con score e framework turni.
        </p>
      </section>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Nuovo festivo manuale</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertHolidayAction} className="grid gap-4 lg:grid-cols-[180px_1fr_120px_1fr_1fr_auto] lg:items-end">
            <Field label="Data" id="date">
              <input id="date" name="date" type="date" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Field label="Nome" id="name">
              <input id="name" name="name" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Field label="Score" id="score">
              <input id="score" name="score" type="number" min="0" step="0.5" defaultValue="1" className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </Field>
            <Field label="Presidio" id="siteId">
              <select id="siteId" name="siteId" defaultValue="__all" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="__all">Tutti i presidi</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Framework" id="defaultShiftFramework">
              <select id="defaultShiftFramework" name="defaultShiftFramework" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {SHIFT_FRAMEWORKS.map((framework) => (
                  <option key={framework} value={framework}>
                    {SHIFT_FRAMEWORK_LABELS[framework]}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800">
              <CalendarPlus className="size-4" />
              Aggiungi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Filtra anno</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3">
            <input name="year" type="number" min="2020" max="2100" defaultValue={year} className="h-10 rounded-md border border-input px-3 text-sm" />
            <Button type="submit" variant="outline" className="rounded-md">
              Filtra
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Presidio</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Modifica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-slate-500">
                    Nessun festivo trovato per l&apos;anno selezionato.
                  </TableCell>
                </TableRow>
              )}
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>{holiday.date.toISOString().slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{holiday.type}</TableCell>
                  <TableCell>{holiday.site?.name ?? "Tutti"}</TableCell>
                  <TableCell>{holiday.score}</TableCell>
                  <TableCell>{SHIFT_FRAMEWORK_LABELS[holiday.defaultShiftFramework]}</TableCell>
                  <TableCell className="w-[520px]">
                    <form action={upsertHolidayAction} className="grid grid-cols-[1fr_80px_1fr_auto] gap-2">
                      <input type="hidden" name="id" value={holiday.id} />
                      <input type="hidden" name="date" value={holiday.date.toISOString().slice(0, 10)} />
                      <input type="hidden" name="type" value={holiday.type} />
                      <input type="hidden" name="siteId" value={holiday.siteId ?? "__all"} />
                      <input name="name" defaultValue={holiday.name} className="h-9 rounded-md border border-input px-2 text-sm" />
                      <input name="score" type="number" step="0.5" min="0" defaultValue={holiday.score} className="h-9 rounded-md border border-input px-2 text-sm" />
                      <select name="defaultShiftFramework" defaultValue={holiday.defaultShiftFramework} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        {SHIFT_FRAMEWORKS.map((framework) => (
                          <option key={framework} value={framework}>
                            {SHIFT_FRAMEWORK_LABELS[framework]}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="confirmOverwrite" />
                        Conferma
                      </label>
                      <Button type="submit" size="sm" variant="outline" className="col-span-4 rounded-md">
                        Salva e aggiorna calendari
                      </Button>
                    </form>
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
