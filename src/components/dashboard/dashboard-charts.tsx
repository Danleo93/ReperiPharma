"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MetricRow = {
  pharmacist: string;
  onCallShifts: number;
  holidayScore: number;
  saturdayMornings: number;
  fridayAfternoons: number;
  callCount: number;
  callDurationHours: number;
};

export function DashboardCharts({ rows }: { rows: MetricRow[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="h-80 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Reperibilita per farmacista</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="pharmacist" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="onCallShifts" name="Reperibilita" fill="#0f766e" />
            <Bar dataKey="holidayScore" name="Score festivi" fill="#d97706" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-80 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Chiamate e durata</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="pharmacist" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="callCount" name="Chiamate" fill="#2563eb" />
            <Bar dataKey="callDurationHours" name="Ore chiamate" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
