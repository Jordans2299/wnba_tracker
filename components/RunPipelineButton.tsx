"use client";

import { useState } from "react";

export default function RunPipelineButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    pendingCount: number;
    lastPipelineRun: string | null;
  } | null>(null);

  async function handleCheck() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/run-pipeline", { method: "POST" });
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold text-white mb-2">Pipeline</h2>
      <p className="text-xs text-court-400 mb-4">
        The scraper runs daily via GitHub Actions. To run manually:
      </p>
      <code className="block text-xs text-court-300 bg-white/[0.04] rounded-lg px-3 py-2 mb-4">
        npm run pipeline
      </code>

      <button
        onClick={handleCheck}
        disabled={loading}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white hover:bg-white/[0.08] transition disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check Pipeline Status"}
      </button>

      {status && (
        <div className="mt-3 text-xs text-court-300 space-y-1">
          <p>Pending updates: <span className="text-white font-medium">{status.pendingCount}</span></p>
          {status.lastPipelineRun && (
            <p>Last run: <span className="text-white">{new Date(status.lastPipelineRun).toLocaleString()}</span></p>
          )}
        </div>
      )}
    </div>
  );
}
