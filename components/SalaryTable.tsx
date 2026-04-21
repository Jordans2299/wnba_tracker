"use client";

import Link from "next/link";
import type { Player } from "@/lib/data";
import { classNames, formatCurrency, formatDate, playerUrl, teamUrl } from "@/lib/utils";

export type SortKey =
  | "name"
  | "salary"
  | "contractStart"
  | "contractEnd"
  | "contractLengthYears";

export type SortDir = "asc" | "desc";

type Props = {
  players: Player[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
};

const COLUMNS: {
  key: SortKey | "team";
  label: string;
  sortable: boolean;
  align?: "left" | "right";
}[] = [
  { key: "name",                label: "Player",   sortable: true  },
  { key: "team",                label: "Team",     sortable: false },
  { key: "salary",              label: "Salary",   sortable: true,  align: "right" },
  { key: "contractLengthYears", label: "Length",   sortable: true,  align: "right" },
  { key: "contractStart",       label: "Start",    sortable: true,  align: "right" },
  { key: "contractEnd",         label: "End",      sortable: true,  align: "right" },
];

function SortIcon({ dir }: { dir: SortDir | null }) {
  return (
    <span className="inline-flex flex-col leading-none ml-1 text-court-400">
      <svg viewBox="0 0 10 6" className={classNames("h-[6px] w-[10px]", dir === "asc" && "text-accent")} fill="currentColor" aria-hidden>
        <path d="M5 0 L10 6 L0 6 Z" />
      </svg>
      <svg viewBox="0 0 10 6" className={classNames("h-[6px] w-[10px] mt-[1px]", dir === "desc" && "text-accent")} fill="currentColor" aria-hidden>
        <path d="M0 0 L10 0 L5 6 Z" />
      </svg>
    </span>
  );
}

export default function SalaryTable({ players, sortKey, sortDir, onSortChange }: Props) {
  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-10 text-center">
        <div className="text-lg font-semibold text-white">No players found</div>
        <div className="mt-1 text-sm text-court-300">Try clearing the search or changing the team filter.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-court-300">
              {COLUMNS.map((c) => {
                const isSorted = c.sortable && sortKey === c.key;
                const dir = isSorted ? sortDir : null;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={classNames(
                      "px-4 py-3 font-medium uppercase tracking-wider text-xs whitespace-nowrap",
                      c.align === "right" ? "text-right" : "text-left",
                      c.sortable && "cursor-pointer select-none hover:text-white"
                    )}
                    onClick={c.sortable ? () => onSortChange(c.key as SortKey) : undefined}
                    aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <span className={classNames("inline-flex items-center", c.align === "right" && "justify-end w-full")}>
                      {c.label}
                      {c.sortable && <SortIcon dir={dir} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.id}
                className={classNames(
                  "border-t border-white/5 transition-colors hover:bg-white/[0.04]",
                  i % 2 === 1 && "bg-white/[0.015]"
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={playerUrl(p.profileSlug)}
                    className="font-medium text-white hover:text-accent transition-colors truncate max-w-[200px] sm:max-w-none block"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={teamUrl(p.team)}
                    className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-court-200 whitespace-nowrap hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-colors"
                  >
                    {p.team}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                  {formatCurrency(p.salary)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-court-200">
                  {p.contractLengthYears} {p.contractLengthYears === 1 ? "yr" : "yrs"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-court-200 whitespace-nowrap">
                  {p.contractStart ? formatDate(p.contractStart) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-court-200 whitespace-nowrap">
                  {p.contractEnd ? formatDate(p.contractEnd) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
