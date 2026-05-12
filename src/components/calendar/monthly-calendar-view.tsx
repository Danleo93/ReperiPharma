"use client";

import { useMemo, useState } from "react";
import { PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateShiftAssignmentAction } from "@/lib/actions/calendar-actions";
import { upsertOnCallRecordAction } from "@/lib/actions/call-actions";
import {
  DAY_TYPE_LABELS,
  MONTH_LABELS,
  SHIFT_TYPE_LABELS,
  calculateMonthlyOnCallCounts,
  durationMinutes,
  formatMinutes,
  resolveAssignmentForCallStart,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type PharmacistOption = {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  color: string;
  active: boolean;
};

type AssignmentItem = {
  id: string;
  shiftType: keyof typeof SHIFT_TYPE_LABELS;
  pharmacistId: string | null;
  pharmacist: PharmacistOption | null;
};

type DayItem = {
  id: string;
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  dayType: keyof typeof DAY_TYPE_LABELS;
  shiftFramework: string;
  holiday: { name: string; score: number } | null;
  assignments: AssignmentItem[];
  callCount: number;
  calls: Array<{
    id: string;
    startTime: string;
    endTime: string;
    department: string;
    physician: string;
    notes: string | null;
    pharmacist: PharmacistOption;
  }>;
};

type Settings = {
  dayOnCallStartTime: string;
  dayOnCallEndTime: string;
  nightOnCallStartTime: string;
  nightOnCallEndTime: string;
};

export function MonthlyCalendarView({
  days,
  pharmacists,
  siteId,
  siteName,
  month,
  year,
  selectedPharmacistId,
  selectedPharmacistName,
  settings,
  readOnly,
}: {
  days: DayItem[];
  pharmacists: PharmacistOption[];
  siteId: string;
  siteName: string;
  month: number;
  year: number;
  selectedPharmacistId?: string;
  selectedPharmacistName?: string;
  settings: Settings;
  readOnly: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState<DayItem | null>(days[0] ?? null);
  const [startTime, setStartTime] = useState("08:00");

  const monthlyCounts = useMemo(
    () => calculateMonthlyOnCallCounts(days.flatMap((day) => day.assignments)),
    [days],
  );
  const visibleShiftCount = useMemo(() => days.reduce((total, day) => total + day.assignments.length, 0), [days]);
  const visibleCallCount = useMemo(() => days.reduce((total, day) => total + day.calls.length, 0), [days]);

  const preferredAssignment = useMemo(() => {
    if (!selectedDay) {
      return null;
    }

    return resolveAssignmentForCallStart(selectedDay.assignments, startTime, settings);
  }, [selectedDay, settings, startTime]);

  const leadingBlanks = days.length ? (days[0].dayOfWeek + 6) % 7 : 0;
  const totalCells = Math.ceil((leadingBlanks + days.length) / 7) * 7;
  const trailingBlanks = totalCells - leadingBlanks - days.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">
              {MONTH_LABELS[month - 1]} {year}
            </h2>
            <p className="text-sm text-slate-500">{siteName}</p>
          </div>
          <Badge className="rounded-md bg-teal-700">{readOnly ? "Consultazione" : "Modificabile"}</Badge>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-600">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((label) => (
            <div key={label} className="px-2 py-2">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: leadingBlanks }).map((_, index) => (
            <div key={`lead-${index}`} className="min-h-40 border-b border-r border-slate-100 bg-slate-50" />
          ))}

          {days.map((day) => {
            const hasFilteredData = day.assignments.length > 0 || day.calls.length > 0;

            return (
            <Dialog key={day.id}>
              <div
                className={cn(
                  "min-h-40 border-b border-r border-slate-100 p-2",
                  day.dayType === "WEEKDAY" && "bg-white",
                  day.dayType === "SATURDAY" && "bg-cyan-50/60",
                  day.dayType === "SUNDAY" && "bg-rose-50",
                  day.dayType.includes("HOLIDAY") && "bg-amber-50",
                  selectedPharmacistId && hasFilteredData && "ring-2 ring-inset ring-teal-500",
                  selectedPharmacistId && !hasFilteredData && "bg-slate-50/70 text-slate-400",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <DialogTrigger
                    render={
                      <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className="rounded-md px-1 text-left text-sm font-semibold hover:bg-white/70"
                      />
                    }
                  >
                    {day.dayOfMonth}
                  </DialogTrigger>
                  <Badge variant="outline" className="rounded-md bg-white/70 text-[10px]">
                    {DAY_TYPE_LABELS[day.dayType]}
                  </Badge>
                </div>

                {day.holiday && <div className="mb-2 truncate text-xs font-medium text-amber-800">{day.holiday.name}</div>}

                {day.callCount > 0 && (
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="mb-2 flex w-full items-center justify-between rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-left text-xs font-semibold text-teal-800 hover:bg-teal-100"
                        aria-label={`Apri ${day.callCount} chiamate del ${day.date}`}
                      />
                    }
                  >
                    <span className="flex items-center gap-1">
                      <PhoneCall className="size-3" />
                      {day.callCount === 1 ? "1 chiamata" : `${day.callCount} chiamate`}
                    </span>
                    <span>Apri</span>
                  </DialogTrigger>
                )}

                <div className="space-y-2">
                  {day.assignments.map((assignment) => (
                    <form key={assignment.id} action={updateShiftAssignmentAction} className="rounded-md border border-slate-200 bg-white p-2">
                      <input type="hidden" name="id" value={assignment.id} />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600">{SHIFT_TYPE_LABELS[assignment.shiftType]}</span>
                        {assignment.pharmacist ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span
                                className="rounded px-2 py-1 text-xs font-bold text-white"
                                style={{ backgroundColor: assignment.pharmacist.color }}
                                />
                              }
                            >
                              {assignment.pharmacist.initials}
                            </TooltipTrigger>
                            <TooltipContent>
                              {assignment.pharmacist.firstName} {assignment.pharmacist.lastName}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="destructive" className="rounded-md text-[10px]">
                            Scoperto
                          </Badge>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="mt-2">
                          <select
                            name="pharmacistId"
                            defaultValue={assignment.pharmacistId ?? ""}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                            aria-label={`Assegna ${SHIFT_TYPE_LABELS[assignment.shiftType]}`}
                            onChange={(event) => event.currentTarget.form?.requestSubmit()}
                          >
                            <option value="">Scoperto</option>
                            {pharmacists.map((pharmacist) => (
                              <option key={pharmacist.id} value={pharmacist.id}>
                                {pharmacist.initials} - {pharmacist.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </form>
                  ))}
                  {selectedPharmacistId && !hasFilteredData && (
                    <div className="rounded-md border border-dashed border-slate-200 bg-white/60 px-2 py-3 text-center text-xs text-slate-400">
                      Nessun turno
                    </div>
                  )}
                </div>

                <DialogTrigger
                  render={
                    <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 w-full rounded-md bg-white/70 text-xs"
                    onClick={() => setSelectedDay(day)}
                    />
                  }
                >
                  <PhoneCall className="size-3" />
                  + chiamata
                </DialogTrigger>
              </div>

              <DialogContent className="max-w-2xl rounded-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedDay?.date} - {selectedDay ? DAY_TYPE_LABELS[selectedDay.dayType] : ""}
                  </DialogTitle>
                </DialogHeader>

                {selectedDay && (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Turni del giorno</h3>
                      {selectedDay.assignments.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                          {selectedPharmacistName
                            ? `Nessun turno per ${selectedPharmacistName} in questa data.`
                            : "Nessun turno in questa data."}
                        </div>
                      ) : (
                        selectedDay.assignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-md border border-slate-200 p-3 text-sm">
                            <div className="font-medium">{SHIFT_TYPE_LABELS[assignment.shiftType]}</div>
                            <div className="text-slate-600">
                              {assignment.pharmacist
                                ? `${assignment.pharmacist.firstName} ${assignment.pharmacist.lastName}`
                                : "Scoperto"}
                            </div>
                          </div>
                        ))
                      )}

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Chiamate registrate</h3>
                        {selectedDay.calls.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                            Nessuna chiamata registrata per questa data.
                          </div>
                        ) : (
                          selectedDay.calls.map((call) => (
                            <div key={call.id} className="rounded-md border border-teal-200 bg-teal-50/70 p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-semibold text-teal-900">
                                  {call.startTime} - {call.endTime}
                                </div>
                                <Badge variant="outline" className="rounded-md bg-white text-teal-800">
                                  {formatMinutes(durationMinutes(call.startTime, call.endTime))}
                                </Badge>
                              </div>
                              <div className="mt-2 space-y-1 text-slate-700">
                                <div>
                                  <span className="font-medium">Farmacista:</span> {call.pharmacist.firstName} {call.pharmacist.lastName}
                                </div>
                                <div>
                                  <span className="font-medium">Reparto:</span> {call.department}
                                </div>
                                <div>
                                  <span className="font-medium">Medico:</span> {call.physician}
                                </div>
                                {call.notes && (
                                  <div>
                                    <span className="font-medium">Note:</span> {call.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <form action={upsertOnCallRecordAction} className="space-y-3">
                      <h3 className="text-sm font-semibold">Nuova chiamata</h3>
                      <input type="hidden" name="calendarDayId" value={selectedDay.id} />
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="shiftAssignmentId" value={preferredAssignment?.id ?? ""} />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="startTime">Ora inizio</Label>
                          <input
                            id="startTime"
                            name="startTime"
                            type="time"
                            value={startTime}
                            onChange={(event) => setStartTime(event.target.value)}
                            className="h-10 w-full rounded-md border border-input px-3 text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="endTime">Ora fine</Label>
                          <input
                            id="endTime"
                            name="endTime"
                            type="time"
                            defaultValue="08:30"
                            className="h-10 w-full rounded-md border border-input px-3 text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="pharmacistId">Farmacista</Label>
                        <select
                          id="pharmacistId"
                          name="pharmacistId"
                          key={`${selectedDay.id}-${startTime}-${preferredAssignment?.pharmacistId ?? selectedPharmacistId ?? "none"}`}
                          defaultValue={preferredAssignment?.pharmacistId ?? selectedPharmacistId ?? ""}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          required
                        >
                          <option value="">Seleziona</option>
                          {pharmacists.map((pharmacist) => (
                            <option key={pharmacist.id} value={pharmacist.id}>
                              {pharmacist.firstName} {pharmacist.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="department">Reparto</Label>
                          <input id="department" name="department" className="h-10 w-full rounded-md border border-input px-3 text-sm" required />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="physician">Medico</Label>
                          <input id="physician" name="physician" className="h-10 w-full rounded-md border border-input px-3 text-sm" required />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="notes">Note</Label>
                        <textarea id="notes" name="notes" className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm" />
                      </div>

                      <Button type="submit" className="w-full rounded-md bg-teal-700 hover:bg-teal-800">
                        Registra chiamata
                      </Button>
                    </form>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            );
          })}

          {Array.from({ length: trailingBlanks }).map((_, index) => (
            <div key={`trail-${index}`} className="min-h-40 border-b border-r border-slate-100 bg-slate-50" />
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Conteggi mese</h3>
          {selectedPharmacistId ? (
            <>
              <div className="mb-3 rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
                {selectedPharmacistName}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Reperibilita" value={monthlyCounts.assigned} />
                <Metric label="Turni totali" value={visibleShiftCount} />
                <Metric label="Chiamate" value={visibleCallCount} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Assegnabili" value={monthlyCounts.assignable} />
                <Metric label="Assegnati" value={monthlyCounts.assigned} />
                <Metric label="Scoperti" value={monthlyCounts.uncovered} tone="danger" />
              </div>
              <div className="mt-4 space-y-2">
                {monthlyCounts.byPharmacist.map((item) => (
                  <div key={item.initials} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.pharmacist}
                    </span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Legenda turni</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SHIFT_TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="rounded-md bg-slate-50 px-2 py-1">
                <span className="font-semibold">{label}</span>
                <span className="ml-1 text-slate-500">{key}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className={cn("rounded-md bg-slate-100 p-3", tone === "danger" && "bg-red-50 text-red-800")}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
