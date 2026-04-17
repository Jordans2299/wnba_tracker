"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Player, TeamSummary } from "@/lib/data";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

type Props = {
  players: Player[];
  summary: TeamSummary;
};

// A purple-to-violet-to-pink-to-indigo palette — all readable on dark bg
const SLICE_COLORS = [
  "#9333ea", // purple-600
  "#c084fc", // purple-400
  "#e879f9", // fuchsia-400
  "#f472b6", // pink-400
  "#fb7185", // rose-400
  "#818cf8", // indigo-400
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#a3e635", // lime-400
  "#fbbf24", // amber-400
  "#f97316", // orange-400
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#4ade80", // green-400
  "#f43f5e", // rose-500
];
const CAP_ROOM_COLOR = "#1f2937"; // gray-800 — muted for "empty" space

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: innerPayload } = payload[0];
  const pct = innerPayload?.pct;
  const isRoom = innerPayload?.isCapRoom;
  return (
    <div className="rounded-lg border border-white/10 bg-court-900/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur max-w-[200px]">
      <div className={`font-semibold ${isRoom ? "text-court-300" : "text-white"} truncate`}>{name}</div>
      <div className={`mt-0.5 font-medium ${isRoom ? "text-court-400" : "text-accent"}`}>
        {formatCurrency(value)}
      </div>
      {pct != null && (
        <div className="mt-0.5 text-court-400">{pct}% of cap</div>
      )}
    </div>
  );
}

// Custom label rendered inside each slice (only for slices large enough)
function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, pct, name,
}: any) {
  if (pct < 4) return null; // skip tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="rgba(255,255,255,0.85)">
      {pct}%
    </text>
  );
}

export default function TeamCapChart({ players, summary }: Props) {
  const cap = summary.salaryCap ?? 7_000_000;
  const signedPlayers = players.filter((p) => p.salary > 0);
  const totalUsed = signedPlayers.reduce((s, p) => s + p.salary, 0);
  const capRoom = Math.max(0, cap - totalUsed);

  // Build pie slices — one per player, plus a cap-room slice
  const playerSlices = signedPlayers
    .sort((a, b) => b.salary - a.salary)
    .map((p, i) => ({
      name: p.name,
      value: p.salary,
      pct: Math.round((p.salary / cap) * 100 * 10) / 10,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      isCapRoom: false,
    }));

  const data = [
    ...playerSlices,
    ...(capRoom > 0
      ? [{ name: "Cap Room", value: capRoom, pct: Math.round((capRoom / cap) * 100 * 10) / 10, color: CAP_ROOM_COLOR, isCapRoom: true }]
      : []),
  ];

  // Usage bar dimensions
  const usedPct = Math.min(100, (totalUsed / cap) * 100);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
      {/* Cap usage bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-court-300 mb-1.5">
          <span>Cap used — {formatCurrency(totalUsed)}</span>
          <span className="text-court-400">{formatCurrency(cap)} cap</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usedPct}%`,
              background: "linear-gradient(to right, #9333ea, #c084fc)",
            }}
          />
        </div>
        <div className="mt-1 text-right text-xs text-court-400">
          {formatCurrency(capRoom)} remaining ({(100 - usedPct).toFixed(1)}%)
        </div>
      </div>

      {/* Donut chart */}
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={1.5}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3">
        {playerSlices.map((s) => (
          <div key={s.name} className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="truncate text-xs text-court-200">{s.name}</span>
            <span className="ml-auto shrink-0 text-xs tabular-nums text-court-400">
              {formatCompactCurrency(s.value)}
            </span>
          </div>
        ))}
        {capRoom > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/10" style={{ background: CAP_ROOM_COLOR }} />
            <span className="text-xs text-court-400">Cap Room</span>
            <span className="ml-auto text-xs tabular-nums text-court-500">
              {formatCompactCurrency(capRoom)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
