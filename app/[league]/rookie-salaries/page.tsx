import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { formatCurrency, playerUrl, teamUrl, isLeague, leagueLabel, LEAGUES, SITE_URL } from "@/lib/utils";

export const revalidate = 86400;

type Props = { params: { league: string } };

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isLeague(params.league)) return {};
  const label = leagueLabel(params.league);
  const year = new Date().getFullYear();
  const title = `${label} Rookie Salaries (${year})`;
  const description = `${label} rookie salaries for the ${year} season. See every rookie's contract value, team, and how their pay compares to the league average.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${params.league}/rookie-salaries` },
    openGraph: { title, description, url: `${SITE_URL}/${params.league}/rookie-salaries` },
  };
}

export default async function RookieSalaries({ params }: Props) {
  if (!isLeague(params.league)) notFound();
  const league = params.league;
  const label = leagueLabel(league);
  const { players, meta } = await getData(league);
  const rookies = players
    .filter((p) => p.status === "Rookie")
    .sort((a, b) => b.salary - a.salary);

  const leagueAvg = players.length ? players.reduce((s, p) => s + p.salary, 0) / players.length : 0;
  const rookieAvg = rookies.length > 0
    ? rookies.reduce((s, p) => s + p.salary, 0) / rookies.length
    : 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        <Link href={`/${league}`} className="inline-flex items-center gap-1.5 text-xs text-court-400 hover:text-white transition-colors mb-6">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All players
        </Link>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Rookie · {meta.season} Season
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {label} Rookie Salaries
          </h1>
          <p className="mt-3 text-sm text-court-300 max-w-2xl leading-relaxed">
            There are <strong className="text-white">{rookies.length} rookies</strong> on {label} rosters in {meta.season}.
            The average rookie salary is <strong className="text-white">{formatCurrency(Math.round(rookieAvg))}</strong>,
            compared to the league-wide average of <strong className="text-white">{formatCurrency(Math.round(leagueAvg))}</strong>.
            {rookies[0] && (
              <>
                {" "}<Link href={playerUrl(rookies[0].profileSlug, league)} className="text-accent hover:underline">{rookies[0].name}</Link>{" "}
                is the highest-earning rookie at {formatCurrency(rookies[0].salary)}.
              </>
            )}
          </p>
        </header>

        {rookies.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-10 text-center">
            <div className="text-sm text-court-300">No rookies found in the current dataset.</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/[0.04] text-court-300">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Player</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Team</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Salary</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium hidden md:table-cell">Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {rookies.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                    >
                      <td className="px-4 py-3 text-court-500 tabular-nums text-xs">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={playerUrl(p.profileSlug, league)} className="text-white hover:text-accent transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Link href={teamUrl(p.team, league)} className="text-xs text-court-300 hover:text-accent transition-colors">
                          {p.team}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                        {formatCurrency(p.salary)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-court-400 text-xs hidden md:table-cell">
                        {p.contractLengthYears > 0 ? `${p.contractLengthYears}yr` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-court-400">
          <Link href={`/${league}/highest-paid-players`} className="hover:text-accent transition-colors">Highest paid players →</Link>
          <Link href={`/${league}/average-salary`} className="hover:text-accent transition-colors">{label} average salary →</Link>
          <Link href={`/${league}/salary-cap`} className="hover:text-accent transition-colors">Team payroll rankings →</Link>
        </div>
      </div>
    </main>
  );
}
