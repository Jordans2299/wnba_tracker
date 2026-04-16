"use client";

type Props = {
  teams: string[];
  value: string;
  onChange: (v: string) => void;
};

export default function TeamFilter({ teams, value, onChange }: Props) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full sm:w-56 rounded-lg border border-white/10 bg-white/[0.04] pl-3 pr-9 py-2.5 text-sm text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition cursor-pointer"
        aria-label="Filter by team"
      >
        <option value="">All Teams</option>
        {teams.map((t) => (
          <option key={t} value={t} className="bg-court-900">
            {t}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-court-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
