import { Save, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePharmacistAction, setPharmacistActiveAction, upsertPharmacistAction } from "@/lib/actions/data-actions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function FarmacistiPage() {
  const [pharmacists, sites] = await Promise.all([
    prisma.pharmacist.findMany({
      include: {
        sites: { include: { site: true } },
        _count: { select: { onCallRecords: true } },
      },
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.site.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Farmacisti</h1>
        <p className="text-sm text-slate-600">
          Anagrafica con iniziali automatiche, presidi associati e stato attivo. Le modifiche nei campi a destra vengono applicate premendo Salva.
        </p>
      </section>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Nuovo farmacista</CardTitle>
        </CardHeader>
        <CardContent>
          <PharmacistForm sites={sites} />
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colore</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Iniziali</TableHead>
                <TableHead>Presidi</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Modifica</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pharmacists.map((pharmacist) => (
                <TableRow key={pharmacist.id}>
                  <TableCell>
                    <span className="block size-5 rounded-full" style={{ backgroundColor: pharmacist.color }} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {pharmacist.firstName} {pharmacist.lastName}
                  </TableCell>
                  <TableCell>{pharmacist.initials}</TableCell>
                  <TableCell className="max-w-56 text-sm text-slate-600">
                    {pharmacist.sites.length > 0
                      ? pharmacist.sites.map((item) => item.site.name).join(", ")
                      : "Nessun presidio"}
                  </TableCell>
                  <TableCell>{pharmacist.active ? "Attivo" : "Disattivo"}</TableCell>
                  <TableCell className="w-[760px]">
                    <PharmacistForm pharmacist={pharmacist} sites={sites} compact />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <form action={setPharmacistActiveAction}>
                        <input type="hidden" name="id" value={pharmacist.id} />
                        <input type="hidden" name="active" value={pharmacist.active ? "false" : "true"} />
                        <Button type="submit" variant="outline" size="sm" className="rounded-md">
                          {pharmacist.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                          {pharmacist.active ? "Disattiva" : "Riattiva"}
                        </Button>
                      </form>
                      <form action={deletePharmacistAction}>
                        <input type="hidden" name="id" value={pharmacist.id} />
                        <Button
                          type="submit"
                          variant="destructive"
                          size="sm"
                          className="rounded-md"
                          disabled={pharmacist._count.onCallRecords > 0}
                          title={
                            pharmacist._count.onCallRecords > 0
                              ? "Non eliminabile: ha chiamate registrate. Usa Disattiva."
                              : "Elimina farmacista"
                          }
                        >
                          <Trash2 className="size-4" />
                          Elimina
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

function PharmacistForm({
  pharmacist,
  sites,
  compact,
}: {
  pharmacist?: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string;
    color: string;
    sites?: Array<{ siteId: string }>;
  };
  sites: Array<{ id: string; name: string; active: boolean }>;
  compact?: boolean;
}) {
  const selectedSiteIds = new Set(
    pharmacist ? pharmacist.sites?.map((site) => site.siteId) ?? [] : sites.filter((site) => site.active).map((site) => site.id),
  );

  return (
    <form action={upsertPharmacistAction} className={compact ? "grid grid-cols-[1fr_1fr_80px_60px_1.4fr_auto] gap-2" : "grid gap-4 md:grid-cols-[1fr_1fr_120px_90px_1.4fr_auto]"}>
      {pharmacist && <input type="hidden" name="id" value={pharmacist.id} />}
      <Field label={compact ? "" : "Nome"} id={`firstName-${pharmacist?.id ?? "new"}`}>
        <input
          id={`firstName-${pharmacist?.id ?? "new"}`}
          name="firstName"
          placeholder="Nome"
          defaultValue={pharmacist?.firstName ?? ""}
          required
          className="h-10 w-full rounded-md border border-input px-3 text-sm"
        />
      </Field>
      <Field label={compact ? "" : "Cognome"} id={`lastName-${pharmacist?.id ?? "new"}`}>
        <input
          id={`lastName-${pharmacist?.id ?? "new"}`}
          name="lastName"
          placeholder="Cognome"
          defaultValue={pharmacist?.lastName ?? ""}
          required
          className="h-10 w-full rounded-md border border-input px-3 text-sm"
        />
      </Field>
      <Field label={compact ? "" : "Iniziali"} id={`initials-${pharmacist?.id ?? "new"}`}>
        <input
          id={`initials-${pharmacist?.id ?? "new"}`}
          name="initials"
          placeholder="Auto"
          maxLength={4}
          defaultValue={pharmacist?.initials ?? ""}
          className="h-10 w-full rounded-md border border-input px-3 text-sm uppercase"
        />
      </Field>
      <Field label={compact ? "" : "Colore"} id={`color-${pharmacist?.id ?? "new"}`}>
        <input
          id={`color-${pharmacist?.id ?? "new"}`}
          name="color"
          type="color"
          defaultValue={pharmacist?.color ?? "#0f766e"}
          className="h-10 w-full rounded-md border border-input px-2"
        />
      </Field>
      <fieldset className="space-y-2">
        {!compact && <legend className="text-sm font-medium">Presidi</legend>}
        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input px-3 py-2">
          {sites.map((site) => (
            <label key={site.id} className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="siteIds"
                value={site.id}
                defaultChecked={selectedSiteIds.has(site.id)}
                disabled={!site.active}
              />
              {site.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800" size={compact ? "sm" : "default"}>
        <Save className="size-4" />
        Salva
      </Button>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      {children}
    </div>
  );
}
