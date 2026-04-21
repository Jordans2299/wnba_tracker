import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { players as allPlayers, teamSummaries, meta } from "@/lib/data";
import { formatCurrency, formatDate, playerUrl, SITE_URL } from "@/lib/utils";
import TeamCapChart from "@/components/TeamCapChart";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return Object.values(teamSummaries).map((t) => ({ slug: t.urlSlug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const summary = Object.values(teamSummaries).find((t) => t.urlSlug === params.slug);
  if (!summary) return {};

  const title = `${summary.name} Salary Cap & Roster (${meta.season})`;
  const description = `${summary.name} ${meta.season} salary cap breakdown. Total payroll, player contracts, cap space, and full roster salaries.`;
  const canonical = `${SITE_URL}/wnba/teams/${summary.urlSlug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-court-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-court-400">{sub}</div>}
    </div>
  );
}

export default function TeamPage({ params }: Props) {
  const summary = Object.values(teamSummaries).find((t) => t.urlSlug === params.slug);
  if (!summary) notFound();

  const roster = allPlayers
    .filter((p) => p.team === summary.name && p.salary > 0)
    .sort((a, b) => b.salary - a.salary);

  const totalSalaries = summary.totalSalaries ?? roster.reduce((s, p) => s + p.salary, 0);
  const cap = summary.salaryCap ?? 7_000_000;
  const capRoom = summary.capRoom ?? Math.max(0, cap - totalSalaries);
  const capUsedPct = Math.round((totalSalaries / cap) * 100);

  const highestPaid = roster[0] ?? null;
  const lowestPaid = roster[roster.length - 1] ?? null;
  const avgSalary = roster.length > 0 ? totalSalaries / roster.length : 0;

  // Team payroll rank vs all teams
  const allTeamPayrolls = Object.values(teamSummaries)
    .map((t) => ({
      name: t.name,
      total: t.totalSalaries ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
  const teamRank = allTeamPayrolls.findIndex((t) => t.name === summary.name) + 1;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: summary.name,
    sport: "Basketball",
    url: `${SITE_URL}/wnba/teams/${summary.urlSlug}`,
    memberOf: {
      "@type": "SportsOrganization",
      name: "WNBA",
    },
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Back nav */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-court-400 hover:text-white transition-colors mb-6"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All players
        </Link>

        {/* Header */}
        <header className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {meta.season} Season · Cap Sheet
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {summary.name}
          </h1>
          <p className="mt-2 text-sm text-court-300">
            {roster.length} players on {meta.season} cap ·{" "}
            <a href={`https://herhoopstats.com/salary-cap-sheet/wnba/`} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-white">
              Her Hoop Stats
            </a>
          </p>
        </header>

        {/* Intro paragraph (SEO) */}
        <p className="mb-6 text-sm text-court-300 leading-relaxed max-w-2xl">
          The <strong className="text-white">{summary.name}</strong> have a total {meta.season} payroll of{" "}
          <strong className="text-white">{formatCurrency(totalSalaries)}</strong>,
          ranking{" "}
          <Link href="/wnba/salary-cap" className="text-accent hover:underline">
            #{teamRank} out of {allTeamPayrolls.length} teams
          </Link>{" "}
          in the league. The team is using {capUsedPct}% of the {formatCurrency(cap)} salary cap
          with {formatCurrency(capRoom)} in remaining cap room.
          {highestPaid && (
            <>
              {" "}<Link href={playerUrl(highestPaid.profileSlug)} className="text-accent hover:underline">{highestPaid.name}</Link> is the highest paid player at {formatCurrency(highestPaid.salary)}.
            </>
          )}
        </p>

        {/* Key stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            label="Salary Cap"
            value={formatCurrency(cap)}
            sub={`${meta.season} league cap`}
          />
          <StatCard
            label="Cap Used"
            value={formatCurrency(totalSalaries)}
            sub={`${capUsedPct}% · Rank #${teamRank}`}
          />
          <StatCard
            label="Cap Room"
            value={formatCurrency(capRoom)}
            sub={`${100 - capUsedPct}% remaining`}
          />
          <StatCard
            label="Guaranteed"
            value={summary.guaranteedSalary != null ? formatCurrency(summary.guaranteedSalary) : "—"}
            sub={summary.openRosterSlots != null ? `${summary.openRosterSlots} open slots` : undefined}
          />
        </section>

        {/* Additional key stats row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {highestPaid && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wider text-court-400 mb-1">Highest Paid</div>
              <Link href={playerUrl(highestPaid.profileSlug)} className="text-white font-semibold hover:text-accent transition-colors">
                {highestPaid.name}
              </Link>
              <div className="text-sm text-court-300 tabular-nums">{formatCurrency(highestPaid.salary)}</div>
            </div>
          )}
          {lowestPaid && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wider text-court-400 mb-1">Lowest Paid</div>
              <Link href={playerUrl(lowestPaid.profileSlug)} className="text-white font-semibold hover:text-accent transition-colors">
                {lowestPaid.name}
              </Link>
              <div className="text-sm text-court-300 tabular-nums">{formatCurrency(lowestPaid.salary)}</div>
            </div>
          )}
          {avgSalary > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wider text-court-400 mb-1">Team Average</div>
              <div className="text-white font-semibold tabular-nums">{formatCurrency(Math.round(avgSalary))}</div>
              <div className="text-xs text-court-400">{roster.length} players</div>
            </div>
          )}
        </section>

        {/* Chart + table */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* Donut chart */}
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-white mb-3">Cap Allocation</h2>
            <TeamCapChart players={roster} summary={summary} />
          </div>

          {/* Roster table */}
          <div className="xl:col-span-3">
            <h2 className="text-sm font-semibold text-white mb-3">Roster</h2>
            <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] text-court-300">
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">#</th>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium">Player</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Salary</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">% of Cap</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Status</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium">Yrs</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium whitespace-nowrap">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((p, i) => {
                      const pct = ((p.salary / cap) * 100).toFixed(1);
                      return (
                        <tr
                          key={p.id}
                          className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                        >
                          <td className="px-4 py-3 text-court-500 tabular-nums text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            <Link href={playerUrl(p.profileSlug)} className="text-white hover:text-accent transition-colors">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                            {formatCurrency(p.salary)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (p.salary / cap) * 100)}%`,
                                    background: "linear-gradient(to right, #9333ea, #c084fc)",
                                  }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-court-300">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.status && (
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border whitespace-nowrap
                                ${p.status === "Protected Veteran" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                                  p.status === "Supermax"          ? "border-accent/30 bg-accent/10 text-accent" :
                                  p.status === "Core"              ? "border-violet-400/30 bg-violet-400/10 text-violet-300" :
                                  p.status === "Rookie"            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
                                                                     "border-white/10 bg-white/[0.04] text-court-300"}`}
                              >
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-court-200 text-xs">
                            {p.contractLengthYears > 0 ? `${p.contractLengthYears}yr` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-court-200 text-xs whitespace-nowrap">
                            {p.contractEnd ? formatDate(p.contractEnd) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10 bg-white/[0.04]">
                      <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-court-300">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-white">
                        {formatCurrency(totalSalaries)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-court-300">
                        {capUsedPct}%
                      </td>
                      <td colSpan={3} className="px-4 py-3 text-right text-xs text-court-400">
                        {formatCurrency(capRoom)} cap room
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Multi-year salary breakdown */}
            <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] overflow-x-auto">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-court-300">Multi-Year Cap Commitments</h3>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.04] text-court-400">
                    <th className="px-4 py-2 text-left font-medium">Player</th>
                    {[2026, 2027, 2028, 2029, 2030].map((y) => (
                      <th key={y} className="px-3 py-2 text-right font-medium">{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((p, i) => (
                    <tr key={p.id} className={`border-t border-white/5 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link href={playerUrl(p.profileSlug)} className="text-court-200 hover:text-accent transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      {[2026, 2027, 2028, 2029, 2030].map((y) => {
                        const ys = p.yearlySalaries.find((yr) => yr.year === y);
                        return (
                          <td key={y} className="px-3 py-2 text-right tabular-nums">
                            {ys?.salary != null ? (
                              <span className="text-white">{formatCurrency(ys.salary)}</span>
                            ) : ys?.status ? (
                              <span className="text-court-500">{ys.status}</span>
                            ) : (
                              <span className="text-court-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Internal links to ranking pages */}
        <div className="mt-8 flex flex-wrap gap-3 text-xs text-court-400">
          <Link href="/wnba/highest-paid-players" className="hover:text-accent transition-colors">
            Highest paid WNBA players →
          </Link>
          <Link href="/wnba/salary-cap" className="hover:text-accent transition-colors">
            All teams by payroll →
          </Link>
          <Link href="/wnba/average-salary" className="hover:text-accent transition-colors">
            WNBA average salary →
          </Link>
        </div>

        <footer className="mt-8 text-center text-xs text-court-500">
          Built with Next.js · Data sourced from{" "}
          <a href="https://herhoopstats.com" className="underline decoration-dotted hover:text-court-300">Her Hoop Stats</a>
          {" · "}Updated daily
        </footer>
      </div>
    </main>
  );
}
