import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { isLeague, leagueLabel, LEAGUES, SITE_URL } from "@/lib/utils";
import HomeClient from "@/components/HomeClient";

export const revalidate = 86400;

type Props = { params: { league: string } };

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isLeague(params.league)) return {};
  const label = leagueLabel(params.league);
  const title = `${label} Wage Tracker - Player Salaries & Contracts`;
  const description = `Browse, search and sort ${label} player salaries and contracts. Explore cap sheets, contract details, and salary rankings for every player in the league.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${params.league}` },
    openGraph: { title, description, url: `${SITE_URL}/${params.league}` },
  };
}

export default async function LeagueHome({ params }: Props) {
  if (!isLeague(params.league)) notFound();
  const { players, teams, meta } = await getData(params.league);
  return <HomeClient players={players} teams={teams} meta={meta} />;
}
