import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateSettingsAction } from "@/lib/actions/data-actions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const settings =
    (await prisma.settings.findFirst()) ??
    ({
      id: "",
      dayOnCallStartTime: "08:00",
      dayOnCallEndTime: "20:00",
      nightOnCallStartTime: "20:00",
      nightOnCallEndTime: "08:00",
      holidayScoreMode: "SPLIT_BETWEEN_ON_CALL_SHIFTS",
    } as const);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-sm text-slate-600">Fasce orarie di reperibilita e modalita calcolo score festivi.</p>
      </section>

      <Card className="max-w-3xl rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Reperibilita e score</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="grid gap-4 md:grid-cols-2">
            {settings.id && <input type="hidden" name="id" value={settings.id} />}
            <Field label="Inizio reperibilita diurna" id="dayOnCallStartTime">
              <input
                id="dayOnCallStartTime"
                name="dayOnCallStartTime"
                type="time"
                defaultValue={settings.dayOnCallStartTime}
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
              />
            </Field>
            <Field label="Fine reperibilita diurna" id="dayOnCallEndTime">
              <input
                id="dayOnCallEndTime"
                name="dayOnCallEndTime"
                type="time"
                defaultValue={settings.dayOnCallEndTime}
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
              />
            </Field>
            <Field label="Inizio reperibilita notturna" id="nightOnCallStartTime">
              <input
                id="nightOnCallStartTime"
                name="nightOnCallStartTime"
                type="time"
                defaultValue={settings.nightOnCallStartTime}
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
              />
            </Field>
            <Field label="Fine reperibilita notturna" id="nightOnCallEndTime">
              <input
                id="nightOnCallEndTime"
                name="nightOnCallEndTime"
                type="time"
                defaultValue={settings.nightOnCallEndTime}
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
              />
            </Field>
            <Field label="Modalita score festivi" id="holidayScoreMode">
              <select
                id="holidayScoreMode"
                name="holidayScoreMode"
                defaultValue={settings.holidayScoreMode}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SPLIT_BETWEEN_ON_CALL_SHIFTS">Dividi tra turni di reperibilita</option>
              </select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="rounded-md bg-teal-700 hover:bg-teal-800">
                <Save className="size-4" />
                Salva impostazioni
              </Button>
            </div>
          </form>
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
