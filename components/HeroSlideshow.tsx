"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, leagueLabel, playerUrl, type League } from "@/lib/utils";

export type SlidePlayer = {
  id: string;
  name: string;
  team: string;
  salary: number;
  league: League;
  photoUrl: string | null;
  profileSlug: string;
};

function enlargeEspnUrl(url: string | null): string | null {
  if (!url) return null;
  // Request a larger image from ESPN's combiner (default is ~350x254)
  if (url.includes("a.espncdn.com/combiner")) {
    const base = url.split("&w=")[0].split("&h=")[0];
    return `${base}&w=480&h=480&scale=crop`;
  }
  return url;
}

export default function HeroSlideshow({ players }: { players: SlidePlayer[] }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (players.length <= 1) return;
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % players.length);
        setFading(false);
      }, 350);
    }, 5000);
    return () => clearInterval(id);
  }, [players.length]);

  if (players.length === 0) return null;

  const player = players[current];
  const isNba = player.league === "nba";
  const photoUrl = enlargeEspnUrl(player.photoUrl);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-court-950" style={{ height: 280 }}>
      {/* Subtle league-colored atmospheric glow */}
      <div
        className={`absolute inset-0 opacity-30 ${
          isNba
            ? "bg-[radial-gradient(ellipse_at_left,_#1e40af_0%,_transparent_60%)]"
            : "bg-[radial-gradient(ellipse_at_left,_#581c87_0%,_transparent_60%)]"
        }`}
      />

      {/* Player photo - right side, large */}
      <div
        className={`absolute right-0 top-0 h-full transition-opacity duration-350 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
        style={{ width: "55%" }}
      >
        {photoUrl ? (
          <div className="relative h-full w-full">
            <Image
              src={photoUrl}
              alt={player.name}
              fill
              sizes="(max-width: 640px) 55vw, 320px"
              className="object-contain object-right-bottom"
              priority
            />
          </div>
        ) : (
          <div className="flex h-full items-end justify-center pb-0">
            <div
              className={`flex h-48 w-48 items-center justify-center rounded-full border-2 text-7xl font-bold ${
                isNba
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  : "bg-accent/10 border-accent/20 text-accent"
              }`}
            >
              {player.name.charAt(0)}
            </div>
          </div>
        )}

        {/* Gradient fade from left so text stays readable */}
        <div className="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-court-950 via-court-950/80 to-transparent pointer-events-none" />
      </div>

      {/* Content - left side */}
      <div
        className={`relative z-10 flex h-full flex-col justify-center px-7 sm:px-10 transition-opacity duration-350 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
        style={{ maxWidth: "55%" }}
      >
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3 ${
            isNba
              ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
              : "border-accent/30 bg-accent/10 text-accent"
          }`}
        >
          <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
          {leagueLabel(player.league)}
        </span>

        <p className="text-[10px] uppercase tracking-widest text-court-400 mb-1">
          Featured Player
        </p>

        <Link
          href={playerUrl(player.profileSlug, player.league)}
          className="text-2xl sm:text-3xl font-extrabold text-white leading-tight hover:text-accent transition-colors"
        >
          {player.name}
        </Link>

        <p className="mt-1 text-sm text-court-300">{player.team}</p>

        <p
          className={`mt-2 text-xl font-bold tabular-nums ${
            isNba ? "text-blue-300" : "text-accent"
          }`}
        >
          {formatCurrency(player.salary)}
        </p>

        <Link
          href={playerUrl(player.profileSlug, player.league)}
          className="mt-4 inline-flex w-fit items-center gap-1.5 text-xs text-court-400 hover:text-white transition-colors"
        >
          View profile
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Bottom dots */}
      <div className="absolute bottom-4 left-7 sm:left-10 flex gap-1.5 z-20">
        {players.map((_, i) => (
          <button
            key={i}
            onClick={() => { setFading(false); setCurrent(i); }}
            className={`rounded-full transition-all duration-200 ${
              i === current
                ? "w-5 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
            }`}
            aria-label={`Go to player ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
