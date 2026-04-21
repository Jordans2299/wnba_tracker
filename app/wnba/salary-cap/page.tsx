import Link from "next/link";
import type { Metadata } from "next";
import { players as allPlayers, teamSummaries, meta } from "@/lib/data";
import { formatCurrency, teamUrl, SITE_URL } from "@/lib/utils";

const title = `WNBA Salary Cap (${new Date().getFullYear()}) — Team Payroll Rankings`;
const description = `WNBA salary cap for ${new Date().getFullYear()} is $7,000,000. See every team's total payroll, cap room, and guaranteed salary ranked by spending.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/wnba/salary-cap` },
  openGraph: { title, description, url: `${SITE_URL}/wnba/salary-cap` },
};

export default function SalaryCap() {
  const CAP = 7_000_000;

  const teamRows = Object.values(teamSummaries)
    .map((t) => {
      const roster = allPlayers.filter((p) => p.team === t.name && p.salary > 0);
      const total = t.totalSalaries ?? roster.reduce((s, p) => s + p.salary, 0);
      const room = t.capRoom ?? Math.max(0, CAP - total);
      return { ...t, total, room, roster };
    })
    .sort((a, b) => b.total - a.total);

  const totalLeaguePayroll = teamRows.reduce((s, t) => s + t.total, 0);

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
            WNBA Salary Cap
          </h1>
          <p className="mt-3 text-sm text-court-300 max-w-2xl leading-relaxed">
            The {meta.season} WNBA salary cap is <strong className="text-white">{formatCurrency(CAP)}</strong> per team.
            All <strong className="text-white">{teamRows.length} teams</strong> are listed below ranked by total payroll.
            Total league-wide payroll is <strong className="text-white">{formatCurrency(totalLeaguePayroll)}</strong>.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-court-300">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Team</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Total Payroll</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Cap Used</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden md:table-cell">Cap Room</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Players</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((t, i) => {
                  const capPct = Math.round((t.total / CAP) * 100);
                  return (
                    <tr
                      key={t.urlSlug}
                      className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                    >
                      <td className="px-4 py-3 text-court-500 tabular-nums text-xs">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={teamUrl(t.name)} className="text-white hover:text-accent transition-colors">
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                        {formatCurrency(t.total)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, capPct)}%`,
                                background: "linear-gradient(to right, #9333ea, #c084fc)",
                              }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-court-300">{capPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-court-300 hidden md:table-cell">
                        {formatCurrency(t.room)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-court-400 text-xs hidden lg:table-cell">
                        {t.roster.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-court-400">
          <Link href="/wnba/highest-paid-players" className="hover:text-accent transition-colors">Highest paid players →</Link>
          <Link href="/wnba/average-salary" className="hover:text-accent transition-colors">WNBA average salary →</Link>
          <Link href="/wnba/rookie-salaries" className="hover:text-accent transition-colors">Rookie salaries →</Link>
        </div>
      </div>
    </main>
  );
}
