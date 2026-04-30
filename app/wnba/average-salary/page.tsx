import Link from "next/link";
import type { Metadata } from "next";
import { players, allPlayers, meta } from "@/lib/data";
import { formatCurrency, playerUrl, teamUrl, SITE_URL } from "@/lib/utils";
import SalaryTrendChart, { type TrendDataPoint } from "@/components/SalaryTrendChart";

const title = `WNBA Average Salary (${new Date().getFullYear()})`;
const description = `The average WNBA salary in ${new Date().getFullYear()}, plus median salary, salary distribution by contract type, and full player breakdown.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/wnba/average-salary` },
  openGraph: { title, description, url: `${SITE_URL}/wnba/average-salary` },
};

export default function AverageSalary() {
  const sorted = [...players].sort((a, b) => b.salary - a.salary);
  const total = sorted.reduce((s, p) => s + p.salary, 0);
  const avg = total / sorted.length;

  // Build year-over-year trend from careerEarnings (filter anomalous low entries)
  const MIN_HIST_SALARY = 50_000;
  const seasonMap = new Map<number, { sum: number; count: number }>();
  for (const player of allPlayers) {
    for (const entry of player.careerEarnings) {
      if (entry.salary >= MIN_HIST_SALARY && entry.season < meta.season) {
        const cur = seasonMap.get(entry.season) ?? { sum: 0, count: 0 };
        seasonMap.set(entry.season, { sum: cur.sum + entry.salary, count: cur.count + 1 });
      }
    }
  }
  // Current season uses authoritative players data
  seasonMap.set(meta.season, { sum: total, count: sorted.length });

  const sortedSeasons = Array.from(seasonMap.entries()).sort(([a], [b]) => a - b);
  const trendData: TrendDataPoint[] = sortedSeasons.map(([season, { sum, count }], i) => {
    const seasonAvg = sum / count;
    const prev = i > 0 ? sortedSeasons[i - 1] : null;
    const prevAvg = prev ? prev[1].sum / prev[1].count : null;
    return {
      season,
      avg: Math.round(seasonAvg),
      count,
      pctChange: prevAvg !== null ? ((seasonAvg - prevAvg) / prevAvg) * 100 : null,
      isNewCba: season >= 2026,
    };
  });

  const cbaJump = trendData.length >= 2
    ? trendData[trendData.length - 1].pctChange
    : null;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1].salary + sorted[mid].salary) / 2
    : sorted[mid].salary;

  const byStatus = sorted.reduce<Record<string, typeof players>>((acc, p) => {
    const key = p.status ?? "Signed";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const statusOrder = ["Supermax", "Core", "Protected Veteran", "Rookie", "Signed"];
  const statusGroups = statusOrder
    .filter((s) => byStatus[s])
    .map((s) => ({
      label: s,
      players: byStatus[s],
      avg: byStatus[s].reduce((sum, p) => sum + p.salary, 0) / byStatus[s].length,
    }));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-court-400 hover:text-white transition-colors mb-6">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All players
        </Link>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {meta.season} Season
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            WNBA Average Salary
          </h1>
          <p className="mt-3 text-sm text-court-300 max-w-2xl leading-relaxed">
            The average WNBA salary in {meta.season} is <strong className="text-white">{formatCurrency(Math.round(avg))}</strong>,
            based on <strong className="text-white">{sorted.length} players</strong> with active contracts.
            The median salary is <strong className="text-white">{formatCurrency(Math.round(median))}</strong>.
            Total league payroll across all teams is <strong className="text-white">{formatCurrency(total)}</strong>.
          </p>
        </header>

        {/* Salary trend chart */}
        <section className="mb-8">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 pt-5 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-sm font-semibold text-white">Average Salary Over Time</h2>
                <p className="mt-0.5 text-xs text-court-400">
                  League-wide average across reported player contracts
                </p>
              </div>
              {cbaJump !== null && (
                <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-right shrink-0">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
                    New CBA impact
                  </div>
                  <div className="mt-0.5 text-xl font-bold text-white tabular-nums">
                    +{cbaJump.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-court-400">
                    {meta.season - 1} → {meta.season}
                  </div>
                </div>
              )}
            </div>
            <SalaryTrendChart data={trendData} />
            <p className="mt-1 pb-1 text-[10px] text-court-500">
              2023–2025 reflects players currently rostered in {meta.season}. 2026 includes all active contracts.
            </p>
          </div>
        </section>

        {/* Summary stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Average Salary", value: formatCurrency(Math.round(avg)) },
            { label: "Median Salary", value: formatCurrency(Math.round(median)) },
            { label: "Highest Salary", value: formatCurrency(sorted[0]?.salary ?? 0) },
            { label: "Lowest Salary", value: formatCurrency(sorted[sorted.length - 1]?.salary ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wider text-court-300">{s.label}</div>
              <div className="mt-1 text-xl font-semibold text-white tabular-nums">{s.value}</div>
            </div>
          ))}
        </section>

        {/* Breakdown by contract type */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-white mb-4">Average Salary by Contract Type</h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-court-300">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Designation</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Players</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Avg Salary</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Max Salary</th>
                </tr>
              </thead>
              <tbody>
                {statusGroups.map((g, i) => (
                  <tr key={g.label} className={`border-t border-white/5 ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                    <td className="px-4 py-3 font-medium text-white">{g.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-court-300">{g.players.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">{formatCurrency(Math.round(g.avg))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-court-300">
                      {formatCurrency(Math.max(...g.players.map((p) => p.salary)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Full player table */}
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">All Players by Salary</h2>
          <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/[0.04] text-court-300">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Player</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Team</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Salary</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden md:table-cell">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => {
                    const diff = ((p.salary / avg - 1) * 100).toFixed(0);
                    const isAbove = p.salary >= avg;
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                      >
                        <td className="px-4 py-3 text-court-500 tabular-nums text-xs">#{i + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          <Link href={playerUrl(p.profileSlug)} className="text-white hover:text-accent transition-colors">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Link href={teamUrl(p.team)} className="text-xs text-court-300 hover:text-accent transition-colors">
                            {p.team}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                          {formatCurrency(p.salary)}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span className={`text-xs tabular-nums ${isAbove ? "text-emerald-400" : "text-court-400"}`}>
                            {isAbove ? "+" : ""}{diff}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-court-400">
          <Link href="/wnba/highest-paid-players" className="hover:text-accent transition-colors">Highest paid players →</Link>
          <Link href="/wnba/salary-cap" className="hover:text-accent transition-colors">Team payroll rankings →</Link>
          <Link href="/wnba/rookie-salaries" className="hover:text-accent transition-colors">Rookie salaries →</Link>
        </div>
      </div>
    </main>
  );
}
