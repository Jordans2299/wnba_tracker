"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { Player } from "@/lib/data";
import { formatCompactCurrency, formatCurrency, teamUrlSlug } from "@/lib/utils";

type Props = {
  players: Player[];
  focusMode?: boolean;
};

const ACCENT = "#9333ea";
const ACCENT_SOFT = "#c084fc";
const ACCENT_HOVER = "#a855f7";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as Player;
  return (
    <div className="rounded-lg border border-white/10 bg-court-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-white">{p.name}</div>
      <div className="text-court-300">{p.team}</div>
      <div className="mt-1 font-medium text-accent">{formatCurrency(p.salary)}</div>
      <div className="mt-1 text-court-400 text-[10px]">Click to view team →</div>
    </div>
  );
}

export default function SalaryChart({ players, focusMode = false }: Props) {
  const router = useRouter();

  const sorted = [...players].sort((a, b) => b.salary - a.salary);
  const limit = focusMode ? sorted.length : 12;
  const data = sorted.slice(0, limit);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-10 text-center">
        <div className="text-sm text-court-300">No data to visualize. Adjust your search or filter.</div>
      </div>
    );
  }

  const maxSalary = Math.max(...data.map((d) => d.salary));
  const barHeight = focusMode ? Math.max(320, data.length * 28) : 360;

  function handleBarClick(entry: Player) {
    router.push(`/teams/${teamUrlSlug(entry.team)}`);
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          {focusMode ? "All Filtered Salaries" : "Top Salaries"}
        </h3>
        <span className="text-xs text-court-400">
          {focusMode ? `${data.length} players` : `Top ${data.length}`} · click bar to view team
        </span>
      </div>
      <div style={{ width: "100%", height: barHeight }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
            onClick={(chartData) => {
              if (chartData?.activePayload?.[0]?.payload) {
                handleBarClick(chartData.activePayload[0].payload as Player);
              }
            }}
          >
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.95} />
                <stop offset="100%" stopColor={ACCENT_SOFT} stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCompactCurrency(Number(v))}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
              domain={[0, Math.ceil(maxSalary * 1.05)]}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "rgba(255,255,255,0.85)", fontSize: 12, cursor: "pointer" }}
              width={140}
              interval={0}
            />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<CustomTooltip />} />
            <Bar
              dataKey="salary"
              fill="url(#barFill)"
              radius={[0, 6, 6, 0]}
              barSize={focusMode ? 16 : 20}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry) => (
                <Cell key={entry.id} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
