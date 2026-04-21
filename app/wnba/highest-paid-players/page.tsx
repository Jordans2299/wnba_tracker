import Link from "next/link";
import type { Metadata } from "next";
import { players, meta } from "@/lib/data";
import { formatCurrency, playerUrl, teamUrl, SITE_URL } from "@/lib/utils";

const title = `Highest Paid WNBA Players (${new Date().getFullYear()})`;
const description = `Complete ranking of the highest paid WNBA players in ${new Date().getFullYear()}. See every player's salary, team, and contract status.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/wnba/highest-paid-players` },
  openGraph: { title, description, url: `${SITE_URL}/wnba/highest-paid-players` },
};

export default function HighestPaidPlayers() {
  const ranked = [...players].sort((a, b) => b.salary - a.salary);
  const leagueAvg = ranked.reduce((s, p) => s + p.salary, 0) / ranked.length;

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
            Highest Paid WNBA Players
          </h1>
          <p className="mt-3 text-sm text-court-300 max-w-2xl leading-relaxed">
            The {meta.season} WNBA season features <strong className="text-white">{ranked.length} players</strong> with active contracts.
            The highest paid player earns{" "}
            <strong className="text-white">{formatCurrency(ranked[0]?.salary ?? 0)}</strong>, while the
            league average salary is <strong className="text-white">{formatCurrency(Math.round(leagueAvg))}</strong>.
            Salaries sourced from{" "}
            <a href="https://herhoopstats.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Her Hoop Stats
            </a>.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-court-300">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium w-12">Rank</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Player</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Team</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Salary</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                  >
                    <td className="px-4 py-3 text-court-500 tabular-nums text-xs font-medium">#{i + 1}</td>
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
                      {p.status && (
                        <span className="text-xs text-court-400">{p.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-court-400">
          <Link href="/wnba/lowest-paid-players" className="hover:text-accent transition-colors">Lowest paid players →</Link>
          <Link href="/wnba/average-salary" className="hover:text-accent transition-colors">WNBA average salary →</Link>
          <Link href="/wnba/salary-cap" className="hover:text-accent transition-colors">Team payroll rankings →</Link>
          <Link href="/wnba/rookie-salaries" className="hover:text-accent transition-colors">Rookie salaries →</Link>
        </div>
      </div>
    </main>
  );
}
