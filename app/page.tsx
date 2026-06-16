import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getData, getLeagueSeasonAverages, type Player } from "@/lib/data";
import { formatCurrency, playerUrl, leagueLabel, type League, SITE_URL } from "@/lib/utils";
import HeroSlideshow, { type SlidePlayer } from "@/components/HeroSlideshow";
import LeagueSalaryTrend from "@/components/LeagueSalaryTrend";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Player Pay - NBA & WNBA Salaries, Contracts & Cap Sheets",
  description:
    "Browse, search and sort NBA and WNBA player salaries and contracts. Explore team cap sheets, contract details, and salary rankings across both leagues.",
  alternates: { canonical: SITE_URL },
};

type NewsArticle = {
  headline: string;
  summary: string | null;
  url: string;
  published: string;
};

async function fetchLeagueNews(league: League, limit = 4): Promise<NewsArticle[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/news?limit=${limit}`,
      { next: { revalidate: 21600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const articles: any[] = data?.articles ?? [];
    return articles.slice(0, limit).map((a) => ({
      headline: a.headline ?? "",
      summary: a.description ?? null,
      url: a.links?.web?.href ?? "#",
      published: a.published ?? "",
    }));
  } catch {
    return [];
  }
}

function LeagueTopEarners({
  league,
  players,
  teamCount,
  avg,
}: {
  league: League;
  players: Player[];
  teamCount: number;
  avg: number;
}) {
  const label = leagueLabel(league);
  const top5 = players.slice(0, 5);
  const isNba = league === "nba";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isNba
          ? "border-blue-500/20 bg-blue-500/[0.04]"
          : "border-accent/20 bg-accent/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isNba
                ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                : "bg-accent/10 border-accent/20 text-accent"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {label}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-xs text-court-400">{players.length} players</span>
            <span className="text-court-700 hidden sm:inline">·</span>
            <span className="text-xs text-court-400">{teamCount} teams</span>
            <span className="text-court-700 hidden sm:inline">·</span>
            <span
              className={`text-xs font-medium ${isNba ? "text-blue-300" : "text-accent"}`}
            >
              {formatCurrency(Math.round(avg))} avg
            </span>
          </div>
        </div>
        <Link
          href={`/${league}`}
          className={`text-xs font-medium flex items-center gap-1 ${
            isNba ? "text-blue-300 hover:text-blue-100" : "text-accent hover:text-accent-hover"
          } transition-colors`}
        >
          View all
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className="space-y-0.5">
        {top5.map((player, i) => (
          <div
            key={player.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
          >
            <span className="w-5 shrink-0 text-center text-xs text-court-500 tabular-nums">
              {i + 1}
            </span>
            {player.photoUrl ? (
              <Image
                src={player.photoUrl}
                alt={player.name}
                width={28}
                height={28}
                className="rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-court-300">
                {player.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={playerUrl(player.profileSlug, league)}
                className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
              >
                {player.name}
              </Link>
              <div className="text-[11px] text-court-400 truncate">{player.team}</div>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                isNba ? "text-blue-300" : "text-accent"
              }`}
            >
              {formatCurrency(player.salary)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-2">
        <Link
          href={`/${league}/highest-paid-players`}
          className="text-[11px] text-court-400 hover:text-white transition-colors"
        >
          Highest Paid
        </Link>
        <Link
          href={`/${league}/average-salary`}
          className="text-[11px] text-court-400 hover:text-white transition-colors"
        >
          Avg Salary
        </Link>
        <Link
          href={`/${league}/salary-cap`}
          className="text-[11px] text-court-400 hover:text-white transition-colors"
        >
          Cap Sheet
        </Link>
        <Link
          href={`/${league}/rookie-salaries`}
          className="text-[11px] text-court-400 hover:text-white transition-colors"
        >
          Rookies
        </Link>
      </div>
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const dateStr = article.published
    ? new Date(article.published).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 hover:bg-white/[0.04] transition-colors"
    >
      <p className="text-sm font-medium text-white leading-snug">{article.headline}</p>
      {article.summary && (
        <p className="mt-1 text-xs text-court-400 line-clamp-2">{article.summary}</p>
      )}
      {dateStr && <p className="mt-2 text-[10px] text-court-500">{dateStr}</p>}
    </a>
  );
}

function NewsColumn({
  articles,
  league,
}: {
  articles: NewsArticle[];
  league: League;
}) {
  if (articles.length === 0) return null;
  const isNba = league === "nba";
  return (
    <div>
      <h3
        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
          isNba ? "text-blue-300" : "text-accent"
        }`}
      >
        {leagueLabel(league)} News
      </h3>
      <div className="space-y-2">
        {articles.map((article, i) => (
          <NewsCard key={i} article={article} />
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [nbaData, wnbaData, nbaHistory, wnbaHistory, nbaNews, wnbaNews] =
    await Promise.all([
      getData("nba"),
      getData("wnba"),
      getLeagueSeasonAverages("nba"),
      getLeagueSeasonAverages("wnba"),
      fetchLeagueNews("nba", 4),
      fetchLeagueNews("wnba", 4),
    ]);

  const nbaSorted = [...nbaData.players].sort((a, b) => b.salary - a.salary);
  const wnbaSorted = [...wnbaData.players].sort((a, b) => b.salary - a.salary);

  const nbaAvg = nbaSorted.length
    ? nbaSorted.reduce((s, p) => s + p.salary, 0) / nbaSorted.length
    : 0;
  const wnbaAvg = wnbaSorted.length
    ? wnbaSorted.reduce((s, p) => s + p.salary, 0) / wnbaSorted.length
    : 0;

  // Interleave top players from each league for the slideshow (prefer players with photos)
  const nbaSlide: SlidePlayer[] = nbaSorted
    .filter((p) => p.photoUrl)
    .slice(0, 5)
    .map((p) => ({ ...p, league: "nba" as League }));
  const wnbaSlide: SlidePlayer[] = wnbaSorted
    .filter((p) => p.photoUrl)
    .slice(0, 5)
    .map((p) => ({ ...p, league: "wnba" as League }));
  const slidePlayers: SlidePlayer[] = [];
  const maxLen = Math.max(nbaSlide.length, wnbaSlide.length);
  for (let i = 0; i < maxLen; i++) {
    if (nbaSlide[i]) slidePlayers.push(nbaSlide[i]);
    if (wnbaSlide[i]) slidePlayers.push(wnbaSlide[i]);
  }

  const hasNews = nbaNews.length > 0 || wnbaNews.length > 0;
  const hasTrend = nbaHistory.length >= 2 || wnbaHistory.length >= 2;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Hero */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            NBA &amp; WNBA Salary Database
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Player Pay
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-court-300">
            Real-time player salaries, contract details, and cap sheet analysis
            for every NBA and WNBA team.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/nba"
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              NBA Salaries
            </Link>
            <Link
              href="/wnba"
              className="rounded-xl border border-accent/30 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              WNBA Salaries
            </Link>
          </div>
        </header>

        {/* Player spotlight */}
        {slidePlayers.length > 0 && (
          <section className="mb-10">
            <HeroSlideshow players={slidePlayers} />
          </section>
        )}

        {/* Top earners per league */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-court-400 uppercase tracking-wider mb-4">
            Top Earners by League
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LeagueTopEarners
              league="nba"
              players={nbaSorted}
              teamCount={nbaData.teams.length}
              avg={nbaAvg}
            />
            <LeagueTopEarners
              league="wnba"
              players={wnbaSorted}
              teamCount={wnbaData.teams.length}
              avg={wnbaAvg}
            />
          </div>
        </section>

        {/* Average salary trend charts */}
        {hasTrend && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-court-400 uppercase tracking-wider mb-4">
              Average Salary Trend
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LeagueSalaryTrend
                data={nbaHistory}
                title="NBA Average Salary"
                color="#60a5fa"
              />
              <LeagueSalaryTrend
                data={wnbaHistory}
                title="WNBA Average Salary"
                color="#9333ea"
              />
            </div>
          </section>
        )}

        {/* Latest news */}
        {hasNews && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-court-400 uppercase tracking-wider mb-4">
              Latest News
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <NewsColumn articles={nbaNews} league="nba" />
              <NewsColumn articles={wnbaNews} league="wnba" />
            </div>
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-court-500">
          NBA &amp; WNBA salary data updated regularly.
        </footer>
      </div>
    </main>
  );
}
