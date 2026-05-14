"use client";

import { useEffect, useState } from "react";

type PendingUpdate = {
  id: number;
  entityType: string;
  entityRef: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  source: string;
  status: string;
  createdAt: string;
};

export default function PendingUpdatesPage() {
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  async function loadUpdates() {
    setLoading(true);
    const res = await fetch("/admin/api/pending");
    const data = await res.json();
    setUpdates(data);
    setLoading(false);
  }

  useEffect(() => { loadUpdates(); }, []);

  async function handleAction(id: number, action: "approve" | "reject") {
    setActing(id);
    await fetch("/admin/api/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setUpdates((prev) => prev.filter((u) => u.id !== id));
    setActing(null);
  }

  async function handleBulkApprove(source: string) {
    const toApprove = updates.filter((u) => u.source === source);
    for (const u of toApprove) {
      await fetch("/admin/api/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, action: "approve" }),
      });
    }
    setUpdates((prev) => prev.filter((u) => u.source !== source));
  }

  // Group by entityRef
  const grouped = updates.reduce<Record<string, PendingUpdate[]>>((acc, u) => {
    if (!acc[u.entityRef]) acc[u.entityRef] = [];
    acc[u.entityRef].push(u);
    return acc;
  }, {});

  const hhsCount = updates.filter((u) => u.source === "hhs").length;
  const searchCount = updates.filter((u) => u.source === "web_search").length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Pending Updates
          {!loading && (
            <span className="ml-2 text-sm font-normal text-court-400">
              ({updates.length})
            </span>
          )}
        </h1>

        {updates.length > 0 && (
          <div className="flex gap-2">
            {hhsCount > 0 && (
              <button
                onClick={() => handleBulkApprove("hhs")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition"
              >
                Approve All HHS ({hhsCount})
              </button>
            )}
            {searchCount > 0 && (
              <button
                onClick={() => handleBulkApprove("web_search")}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition"
              >
                Approve All Web Search ({searchCount})
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-court-400">Loading...</div>
      ) : updates.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <div className="text-sm text-court-300">No pending updates</div>
          <p className="mt-1 text-xs text-court-500">
            Run the pipeline to check for new salary data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([entityRef, items]) => (
            <div
              key={entityRef}
              className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden"
            >
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white">
                    {entityRef.split(":")[0]}
                  </span>
                  <span className="ml-2 text-xs text-court-400">
                    {items[0].entityType === "player_salary" ? "Player" : "Team"} · Season {entityRef.split(":")[1]}
                  </span>
                </div>
                <SourceBadge source={items[0].source} />
              </div>

              <div className="divide-y divide-white/5">
                {items.map((u) => (
                  <div
                    key={u.id}
                    className="px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-court-400 mb-1">
                        {u.fieldName}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-400 line-through tabular-nums">
                          {formatValue(u.fieldName, u.oldValue)}
                        </span>
                        <span className="text-court-500">→</span>
                        <span className="text-emerald-400 font-medium tabular-nums">
                          {formatValue(u.fieldName, u.newValue)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(u.id, "approve")}
                        disabled={acting === u.id}
                        className="rounded-md bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(u.id, "reject")}
                        disabled={acting === u.id}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-court-300 hover:bg-white/[0.06] transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    hhs: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    web_search: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    manual: "border-white/10 bg-white/[0.04] text-court-300",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${styles[source] ?? styles.manual}`}>
      {source === "hhs" ? "HHS" : source === "web_search" ? "Web Search" : source}
    </span>
  );
}

function formatValue(field: string, value: string | null): string {
  if (value == null) return "—";
  if (field === "salary" || field.includes("salari") || field.includes("cap") || field.includes("guaranteed")) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return `$${num.toLocaleString()}`;
  }
  return value;
}
