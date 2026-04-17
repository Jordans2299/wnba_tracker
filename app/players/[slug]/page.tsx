import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allPlayers, meta } from "@/lib/data";
import { formatCurrency, formatDate, teamUrlSlug } from "@/lib/utils";
import EarningsChart from "@/components/EarningsChart";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return allPlayers
    .filter((p) => p.profileSlug)
    .map((p) => ({ slug: p.profileSlug }));
}

export function generateMetadata({ params }: Props) {
  const player = allPlayers.find((p) => p.profileSlug === params.slug);
  if (!player) return {};
  return {
    title: `${player.name} — WNBA Wage Tracker`,
    description: `${player.name}'s salary, contract, and career earnings history. Currently with the ${player.team}.`,
  };
}

const STATUS_STYLES: Record<string, string> = {
  "Protected Veteran": "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "Supermax":          "border-accent/30 bg-accent/10 text-accent",
  "Core":              "border-violet-400/30 bg-violet-400/10 text-violet-300",
  "Rookie":            "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "Signed":            "border-white/10 bg-white/[0.04] text-court-300",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-wider text-court-300">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-court-400">{sub}</div>}
    </div>
  );
}

export default function PlayerPage({ params }: Props) {
  const player = allPlayers.find((p) => p.profileSlug === params.slug);
  if (!player) notFound();

  const cap = 7_000_000;
  const capPct = player.salary > 0 ? ((player.salary / cap) * 100).toFixed(1) : null;

  const peakEarning = player.careerEarnings.length
    ? player.careerEarnings.reduce((best, e) => (e.salary > best.salary ? e : best))
    : null;

  const teamsInCareer = Array.from(
    new Map(player.careerEarnings.map((e) => [e.team, e.team])).values()
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-court-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All players
          </Link>
          <span className="text-court-600">/</span>
          <Link
            href={`/teams/${teamUrlSlug(player.team)}`}
            className="text-xs text-court-400 hover:text-white transition-colors"
          >
            {player.team}
          </Link>
        </div>

        {/* Hero ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8 items-start">
          {/* Photo */}
          <div className="shrink-0">
            <div className="relative h-36 w-28 sm:h-44 sm:w-36 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={player.name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 112px, 144px"
                  unoptimized
                />
              ) : (
                /* Generated avatar fallback */
                <div className="h-full w-full flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="h-16 w-16 text-court-600">
                    <circle cx="50" cy="38" r="20" fill="currentColor" />
                    <ellipse cx="50" cy="85" rx="32" ry="22" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {player.status && STATUS_STYLES[player.status] && (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${STATUS_STYLES[player.status]}`}>
                  {player.status}
                </span>
              )}
              <span className="text-xs text-court-400">{meta.season} Season</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              {player.name}
            </h1>

            <Link
              href={`/teams/${teamUrlSlug(player.team)}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-court-300 hover:text-accent transition-colors"
            >
              {player.team}
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            {/* Cap usage bar */}
            {player.salary > 0 && capPct && (
              <div className="mt-4 max-w-xs">
                <div className="flex justify-between text-xs text-court-400 mb-1">
                  <span>{capPct}% of salary cap</span>
                  <span>{formatCurrency(player.salary)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, parseFloat(capPct))}%`,
                      background: "linear-gradient(to right, #9333ea, #c084fc)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Teams played for */}
            {teamsInCareer.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {teamsInCareer.map((t) => (
                  <Link
                    key={t}
                    href={`/teams/${teamUrlSlug(t)}`}
                    className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-court-300 hover:border-accent/40 hover:text-accent transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="Current Salary"
            value={player.salary > 0 ? formatCurrency(player.salary) : "Unsigned"}
            sub={player.status ?? undefined}
          />
          <StatCard
            label="Total Career Earnings"
            value={player.totalCareerEarnings > 0 ? formatCurrency(player.totalCareerEarnings) : "—"}
            sub={`${player.careerEarnings.length} season${player.careerEarnings.length !== 1 ? "s" : ""} tracked`}
          />
          <StatCard
            label="Peak Salary"
            value={peakEarning ? formatCurrency(peakEarning.salary) : "—"}
            sub={peakEarning ? `${peakEarning.season} · ${peakEarning.team}` : undefined}
          />
          <StatCard
            label="Contract"
            value={player.contractLengthYears > 0 ? `${player.contractLengthYears} year${player.contractLengthYears !== 1 ? "s" : ""}` : "—"}
            sub={player.contractEnd ? `Expires ${formatDate(player.contractEnd)}` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left column: earnings chart + history table */}
          <div className="lg:col-span-3 space-y-5">

            {/* Earnings chart */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Earnings History</h2>
              <EarningsChart earnings={player.careerEarnings} currentSeason={meta.season} />
            </div>

            {/* Career earnings table */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-white">Season by Season</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] text-court-300">
                      <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-medium">Season</th>
                      <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-medium">Team</th>
                      <th className="px-4 py-2.5 text-right text-xs uppercase tracking-wider font-medium">Salary</th>
                      <th className="px-4 py-2.5 text-right text-xs uppercase tracking-wider font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...player.careerEarnings].reverse().map((e, i) => (
                      <tr
                        key={`${e.season}-${e.team}`}
                        className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.015]" : ""} ${e.season === meta.season ? "border-l-2 border-l-accent" : ""}`}
                      >
                        <td className="px-4 py-3 tabular-nums font-medium text-white">
                          {e.season}
                          {e.season === meta.season && (
                            <span className="ml-2 text-[10px] text-accent uppercase tracking-wider">current</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/teams/${teamUrlSlug(e.team)}`}
                            className="text-court-200 hover:text-accent transition-colors text-xs"
                          >
                            {e.team}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                          {formatCurrency(e.salary)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.status && (
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${STATUS_STYLES[e.status] ?? "border-white/10 bg-white/[0.04] text-court-300"}`}>
                              {e.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10 bg-white/[0.04]">
                      <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-court-300">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-white">
                        {formatCurrency(player.totalCareerEarnings)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Right column: contract details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Current contract */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Current Contract</h2>
              <dl className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-court-400">Annual Salary</dt>
                  <dd className="font-semibold text-white tabular-nums">
                    {player.salary > 0 ? formatCurrency(player.salary) : "Unsigned"}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-court-400">Length</dt>
                  <dd className="text-white">
                    {player.contractLengthYears > 0 ? `${player.contractLengthYears} year${player.contractLengthYears !== 1 ? "s" : ""}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-court-400">Start</dt>
                  <dd className="text-white tabular-nums">
                    {player.contractStart ? formatDate(player.contractStart) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-court-400">Expires</dt>
                  <dd className="text-white tabular-nums">
                    {player.contractEnd ? formatDate(player.contractEnd) : "—"}
                  </dd>
                </div>
                {player.status && (
                  <div className="flex justify-between text-sm items-center">
                    <dt className="text-court-400">Designation</dt>
                    <dd>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${STATUS_STYLES[player.status] ?? "border-white/10 bg-white/[0.04] text-court-300"}`}>
                        {player.status}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Multi-year commitments */}
            {player.yearlySalaries.some(y => y.salary != null) && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Year-by-Year Cap Hits</h2>
                <div className="space-y-2.5">
                  {player.yearlySalaries.map((y) => {
                    const isActive = y.salary != null;
                    const pct = isActive && y.salary ? Math.min(100, (y.salary / cap) * 100) : 0;
                    return (
                      <div key={y.year}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={isActive ? "text-white font-medium" : "text-court-500"}>
                            {y.year}
                          </span>
                          <span className={isActive ? "text-white tabular-nums" : "text-court-500"}>
                            {y.salary != null ? formatCurrency(y.salary) : (y.status ?? "—")}
                          </span>
                        </div>
                        {isActive && (
                          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: "linear-gradient(to right, #9333ea, #c084fc)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source */}
            <p className="text-xs text-court-500 px-1">
              Data sourced from{" "}
              <a href={meta.source} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-court-300">
                Her Hoop Stats
              </a>
              . Contract dates derived from cap sheet data.{" "}
              Updated{" "}
              {new Date(meta.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
            </p>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-court-500">
          <Link href="/" className="hover:text-court-300 transition-colors">← Back to all players</Link>
          {" · "}
          <Link href={`/teams/${teamUrlSlug(player.team)}`} className="hover:text-court-300 transition-colors">
            {player.team} cap sheet →
          </Link>
        </footer>
      </div>
    </main>
  );
}
