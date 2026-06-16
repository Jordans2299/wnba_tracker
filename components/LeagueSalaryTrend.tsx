"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { SeasonAverage } from "@/lib/data";

type Props = {
  data: SeasonAverage[];
  title: string;
  color?: string;
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SeasonAverage;
  const startYear = d.season - 1;
  const endYear = String(d.season).slice(2);
  return (
    <div className="rounded-lg border border-white/10 bg-court-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-white">{startYear}-{endYear} Season</div>
      <div className="text-accent mt-1">{formatCurrency(d.avg)} avg</div>
      <div className="text-court-400">{d.count} players</div>
    </div>
  );
}

export default function LeagueSalaryTrend({ data, title, color = "#9333ea" }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-xs text-court-500">
        Historical data not yet available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h4 className="text-xs font-medium text-court-300 uppercase tracking-wider mb-4">{title}</h4>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="season"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              stroke="transparent"
              tickFormatter={(v) => `'${String(v).slice(2)}`}
            />
            <YAxis
              tickFormatter={(v) => formatCompactCurrency(Number(v))}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              stroke="transparent"
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="avg"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
