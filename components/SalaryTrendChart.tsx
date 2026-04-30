"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

export type TrendDataPoint = {
  season: number;
  avg: number;
  count: number;
  pctChange: number | null;
  isNewCba: boolean;
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TrendDataPoint;
  return (
    <div className="rounded-lg border border-white/10 bg-court-900/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-white">{label} Season</div>
      {d.isNewCba && (
        <div className="mt-0.5 text-[10px] font-medium text-accent tracking-wide">
          ✦ New Collective Bargaining Agreement
        </div>
      )}
      <div className="mt-1.5 text-base font-bold text-white tabular-nums">
        {formatCurrency(d.avg)}
      </div>
      {d.pctChange !== null && (
        <div
          className={`mt-0.5 font-medium ${d.pctChange >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {d.pctChange >= 0 ? "↑" : "↓"} {Math.abs(d.pctChange).toFixed(1)}% from{" "}
          {d.season - 1}
        </div>
      )}
      <div className="mt-1 text-court-400">{d.count} players</div>
    </div>
  );
}

function CustomBarLabel(props: any) {
  const { x, y, width, value, index, data } = props;
  const d: TrendDataPoint | undefined = data?.[index];
  if (!d || !value) return null;
  const cx = x + width / 2;
  const hasPct = d.pctChange !== null;

  return (
    <g>
      <text
        x={cx}
        y={y - (hasPct ? 22 : 10)}
        textAnchor="middle"
        fill={d.isNewCba ? "#e9d5ff" : "rgba(255,255,255,0.8)"}
        fontSize={d.isNewCba ? 13 : 12}
        fontWeight={d.isNewCba ? "700" : "500"}
      >
        {formatCompactCurrency(value)}
      </text>
      {hasPct && (
        <text
          x={cx}
          y={y - 8}
          textAnchor="middle"
          fill={d.pctChange! >= 0 ? "#34d399" : "#f87171"}
          fontSize={10}
          fontWeight="600"
        >
          {d.pctChange! >= 0 ? "+" : ""}
          {d.pctChange!.toFixed(0)}%
        </text>
      )}
    </g>
  );
}

function CustomXAxisTick({ x, y, payload }: any) {
  const isNewCba = payload.value >= 2026;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={isNewCba ? "#c084fc" : "rgba(255,255,255,0.65)"}
        fontSize={12}
        fontWeight={isNewCba ? "600" : "400"}
      >
        {payload.value}
      </text>
      <text
        x={0}
        y={0}
        dy={27}
        textAnchor="middle"
        fill={isNewCba ? "#9333ea" : "rgba(255,255,255,0.25)"}
        fontSize={9}
        fontWeight="600"
        letterSpacing="0.05em"
      >
        {isNewCba ? "NEW CBA" : "OLD CBA"}
      </text>
    </g>
  );
}

export default function SalaryTrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 42, right: 16, bottom: 24, left: 4 }}>
          <defs>
            <linearGradient id="newCbaBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>
            <linearGradient id="oldCbaBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b21a8" stopOpacity={0.65} />
              <stop offset="100%" stopColor="#3b0764" stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="season"
            stroke="transparent"
            tick={<CustomXAxisTick />}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatCompactCurrency}
            stroke="transparent"
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="avg" radius={[5, 5, 0, 0]} maxBarSize={80}>
            <LabelList
              content={(props: any) => <CustomBarLabel {...props} data={data} />}
            />
            {data.map((d) => (
              <Cell
                key={d.season}
                fill={d.isNewCba ? "url(#newCbaBarGrad)" : "url(#oldCbaBarGrad)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
