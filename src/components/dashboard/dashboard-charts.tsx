"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
  type TooltipValueType,
} from "recharts";
import { formatMinutes } from "@/lib/domain";

type MetricRow = {
  pharmacist: string;
  onCallShifts: number;
  holidayScore: number;
  saturdayMornings: number;
  fridayAfternoons: number;
  callCount: number;
  callDurationMinutes: number;
  callDurationHours: number;
};

export function DashboardCharts({ rows }: { rows: MetricRow[] }) {
  const shiftRows = rows.filter((row) => row.onCallShifts > 0 || row.holidayScore > 0);
  const callRows = rows.filter((row) => row.callCount > 0 || row.callDurationMinutes > 0);
  const shiftTicks = numberAxisTicks(Math.max(0, ...shiftRows.map((row) => Math.max(row.onCallShifts, row.holidayScore))));
  const callTicks = numberAxisTicks(Math.max(0, ...callRows.map((row) => Math.max(row.callCount, row.callDurationHours))));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" style={{ height: chartHeight(shiftRows.length) }}>
        <h3 className="mb-4 text-sm font-semibold">Reperibilita per farmacista</h3>
        {shiftRows.length > 0 ? (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={shiftRows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }} barCategoryGap={12}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" ticks={shiftTicks} domain={[0, lastTick(shiftTicks)]} tickFormatter={axisTickFormatter} />
              <YAxis type="category" dataKey="pharmacist" width={170} tick={{ fontSize: 12 }} interval={0} />
              <Tooltip formatter={defaultTooltipFormatter} />
              <Legend />
              <Bar dataKey="onCallShifts" name="Reperibilita" fill="#0f766e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="holidayScore" name="Score festivi" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Nessuna reperibilita assegnata nei filtri selezionati." />
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" style={{ height: chartHeight(callRows.length) }}>
        <h3 className="mb-4 text-sm font-semibold">Chiamate e durata</h3>
        {callRows.length > 0 ? (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={callRows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }} barCategoryGap={12}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" ticks={callTicks} domain={[0, lastTick(callTicks)]} tickFormatter={axisTickFormatter} />
              <YAxis type="category" dataKey="pharmacist" width={170} tick={{ fontSize: 12 }} interval={0} />
              <Tooltip formatter={callTooltipFormatter} />
              <Legend />
              <Bar dataKey="callCount" name="Chiamate" fill="#2563eb" radius={[0, 4, 4, 0]} />
              <Bar dataKey="callDurationHours" name="Ore chiamate" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Nessuna chiamata registrata nei filtri selezionati." />
        )}
      </div>
    </div>
  );
}

type TooltipNameType = string | number;

const defaultTooltipFormatter: TooltipProps<TooltipValueType, TooltipNameType>["formatter"] = (value, name) => [
  value ?? 0,
  name ?? "",
];

const callTooltipFormatter: TooltipProps<TooltipValueType, TooltipNameType>["formatter"] = (value, name) => {
  if (name === "Ore chiamate" && typeof value === "number") {
    return [formatMinutes(Math.round(value * 60)), name];
  }

  return [value ?? 0, name ?? ""];
};

function chartHeight(rowCount: number) {
  return Math.max(320, Math.min(560, rowCount * 48 + 140));
}

function numberAxisTicks(maxValue: number) {
  if (!Number.isFinite(maxValue) || maxValue <= 1) {
    return [0, 1];
  }

  const rawStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const step = Math.max(1, niceStep);
  const maxTick = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= maxTick + step / 2; value += step) {
    ticks.push(Number(value.toFixed(2)));
  }

  return ticks;
}

function lastTick(ticks: number[]) {
  return ticks[ticks.length - 1] ?? 1;
}

function axisTickFormatter(value: number | string) {
  return Number(value).toLocaleString("it-IT", { maximumFractionDigits: 0 });
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[85%] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">{message}</div>;
}
