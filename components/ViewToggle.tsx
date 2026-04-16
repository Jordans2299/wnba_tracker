"use client";

import { classNames } from "@/lib/utils";

export type View = "table" | "chart";

type Props = {
  value: View;
  onChange: (v: View) => void;
};

export default function ViewToggle({ value, onChange }: Props) {
  const opts: { key: View; label: string }[] = [
    { key: "table", label: "Table" },
    { key: "chart", label: "Chart" },
  ];
  return (
    <div
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1"
      role="tablist"
      aria-label="View toggle"
    >
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={classNames(
              "px-3 py-1.5 text-xs font-medium rounded-md transition",
              active
                ? "bg-accent text-white shadow-sm"
                : "text-court-300 hover:text-white"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
