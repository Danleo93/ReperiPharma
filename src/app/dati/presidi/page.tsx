import { Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSiteAction, setSiteActiveAction, upsertSiteAction } from "@/lib/actions/data-actions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function PresidiPage() {
  const sites = await prisma.site.findMany({
    include: {
      _count: { select: { calendarYears: true, assignments: true, onCallRecords: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Presidi</h1>
        <p className="text-sm text-slate-600">Gestisci i presidi disponibili per calendari e chiamate.</p>
      </section>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Nuovo presidio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertSiteAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="name">Nome presidio</Label>
              <input id="name" name="name" required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </div>
            <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800">
              <Building2 className="size-4" />
              Crea presidio
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Calendari</TableHead>
                <TableHead>Modifica</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{site.active ? "Attivo" : "Disattivo"}</TableCell>
                  <TableCell>{site._count.calendarYears}</TableCell>
                  <TableCell>
                    <form action={upsertSiteAction} className="flex gap-2">
                      <input type="hidden" name="id" value={site.id} />
                      <input name="name" defaultValue={site.name} className="h-9 rounded-md border border-input px-3 text-sm" />
                      <Button type="submit" size="sm" variant="outline" className="rounded-md">
                        Salva
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <form action={setSiteActiveAction}>
                        <input type="hidden" name="id" value={site.id} />
                        <input type="hidden" name="active" value={site.active ? "false" : "true"} />
                        <Button type="submit" size="sm" variant="outline" className="rounded-md">
                          {site.active ? "Disattiva" : "Riattiva"}
                        </Button>
                      </form>
                      <form action={deleteSiteAction}>
                        <input type="hidden" name="id" value={site.id} />
                        <Button
                          type="submit"
                          size="icon"
                          variant="ghost"
                          className="rounded-md text-red-700"
                          disabled={site._count.calendarYears + site._count.assignments + site._count.onCallRecords > 0}
                          aria-label="Elimina presidio"
                        >
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
