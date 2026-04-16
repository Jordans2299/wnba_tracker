"use client";

import { useEffect, useMemo, useState } from "react";
import { players as allPlayers, teams, meta } from "@/lib/data";
import SalaryTable, { SortDir, SortKey } from "@/components/SalaryTable";
import SalaryChart from "@/components/SalaryChart";
import SearchBar from "@/components/SearchBar";
import TeamFilter from "@/components/TeamFilter";
import StatsSummary from "@/components/StatsSummary";
import ViewToggle, { View } from "@/components/ViewToggle";
import { classNames } from "@/lib/utils";

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("salary");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useState<View>("table");

  // Small loading state for polish
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPlayers.filter((p) => {
      if (team && p.team !== team) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, team]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "salary":
          cmp = a.salary - b.salary;
          break;
        case "contractLengthYears":
          cmp = a.contractLengthYears - b.contractLengthYears;
          break;
        case "contractStart":
          cmp =
            (a.contractStart ? new Date(a.contractStart).getTime() : 0) -
            (b.contractStart ? new Date(b.contractStart).getTime() : 0);
          break;
        case "contractEnd":
          cmp =
            (a.contractEnd ? new Date(a.contractEnd).getTime() : 0) -
            (b.contractEnd ? new Date(b.contractEnd).getTime() : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Sensible defaults: salary & length default desc; names/dates default asc
      setSortDir(
        key === "salary" || key === "contractLengthYears" ? "desc" : "asc"
      );
    }
  }

  function toggleDir() {
    setSortDir(sortDir === "asc" ? "desc" : "asc");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              WNBA Salary Data · {meta.season} Season
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              WNBA Wage Tracker
            </h1>
            <p className="mt-2 text-sm sm:text-base text-court-300 max-w-2xl">
              Browse, search, and sort player salaries and contracts across the
              league. Updated daily from{" "}
              <a
                href={meta.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-white"
              >
                Her Hoop Stats
              </a>
              {" · "}
              <span className="text-court-400">
                last updated{" "}
                {new Date(meta.lastUpdated).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              .
            </p>
          </div>
          <ViewToggle value={view} onChange={setView} />
        </header>

        {/* Summary */}
        <section className="mb-6">
          <StatsSummary players={sorted} totalCount={allPlayers.length} />
        </section>

        {/* Controls */}
        <section className="mb-5 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search players by name…"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
            <TeamFilter teams={teams} value={team} onChange={setTeam} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-court-400 whitespace-nowrap">
                Sort by
              </label>
              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-3 pr-9 py-2.5 text-sm text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition cursor-pointer"
                  aria-label="Sort by"
                >
                  <option value="salary" className="bg-court-900">Salary</option>
                  <option value="name" className="bg-court-900">Player Name</option>
                  <option value="contractLengthYears" className="bg-court-900">Contract Length</option>
                  <option value="contractStart" className="bg-court-900">Contract Start</option>
                  <option value="contractEnd" className="bg-court-900">Contract End</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-court-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <button
                onClick={toggleDir}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white hover:bg-white/[0.08] transition inline-flex items-center gap-1.5"
                aria-label={`Toggle sort direction. Currently ${sortDir}ending.`}
                title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={classNames(
                    "h-4 w-4 transition-transform",
                    sortDir === "asc" ? "rotate-180" : ""
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span className="hidden sm:inline text-xs uppercase tracking-wider">
                  {sortDir}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : view === "table" ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 order-2 xl:order-1">
              <SalaryTable
                players={sorted}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
              />
            </div>
            <div className="xl:col-span-1 order-1 xl:order-2">
              <SalaryChart players={sorted} />
            </div>
          </div>
        ) : (
          <SalaryChart players={sorted} focusMode />
        )}

        <footer className="mt-10 text-center text-xs text-court-500">
          Built with Next.js · Data is mocked for demo purposes.
        </footer>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="h-10 bg-white/[0.04]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-t border-white/5 flex items-center gap-4 px-4"
          >
            <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
            <div className="ml-auto h-3 w-20 rounded bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 h-[360px]">
        <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-white/5 animate-pulse"
              style={{ width: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
