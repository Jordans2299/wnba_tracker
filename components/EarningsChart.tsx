"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CareerEntry } from "@/lib/data";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

type Props = { earnings: CareerEntry[]; currentSeason: number };

const COLORS = {
  current: "#9333ea",
  past: "#4b2d7f",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const e = payload[0].payload as CareerEntry;
  return (
    <div className="rounded-lg border border-white/10 bg-court-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-white">{label} Season</div>
      <div className="text-court-300 truncate max-w-[160px]">{e.team}</div>
      <div className="mt-1 font-medium text-accent">{formatCurrency(e.salary)}</div>
      {e.status && <div className="mt-0.5 text-court-400">{e.status}</div>}
    </div>
  );
}

export default function EarningsChart({ earnings, currentSeason }: Props) {
  if (!earnings.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-court-400">
        No earnings history available.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={earnings} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="season"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => formatCompactCurrency(v)}
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            width={52}
          />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<CustomTooltip />} />
          <Bar dataKey="salary" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {earnings.map((e) => (
              <Cell
                key={e.season}
                fill={e.season === currentSeason ? COLORS.current : COLORS.past}
                fillOpacity={e.season === currentSeason ? 1 : 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
