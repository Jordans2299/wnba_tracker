import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { Player } from "@/lib/data";

type Props = {
  players: Player[];
  totalCount: number;
};

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:p-5 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-court-300">
        {label}
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-semibold text-white">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-court-400 truncate">{sublabel}</div>
      )}
    </div>
  );
}

export default function StatsSummary({ players, totalCount }: Props) {
  if (players.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Players Shown" value="0" sublabel={`of ${totalCount}`} />
        <Stat label="Highest Salary" value="—" />
        <Stat label="Average Salary" value="—" />
        <Stat label="Total Payroll" value="—" />
      </div>
    );
  }

  const salaries = players.map((p) => p.salary);
  const max = Math.max(...salaries);
  const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
  const total = salaries.reduce((a, b) => a + b, 0);
  const topPlayer = players.find((p) => p.salary === max);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        label="Players Shown"
        value={players.length.toString()}
        sublabel={`of ${totalCount} total`}
      />
      <Stat
        label="Highest Salary"
        value={formatCurrency(max)}
        sublabel={topPlayer ? `${topPlayer.name} · ${topPlayer.team}` : undefined}
      />
      <Stat label="Average Salary" value={formatCurrency(Math.round(avg))} />
      <Stat label="Total Payroll" value={formatCompactCurrency(total)} />
    </div>
  );
}
