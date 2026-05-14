"use client";

import { useState } from "react";

export default function RunPipelineButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ total: number } | null>(null);
  const [error, setError] = useState("");

  async function handleRun() {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/admin/api/run-pipeline", { method: "POST" });
      if (!res.ok) throw new Error("Pipeline failed");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setRunning(false);
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={running}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white hover:bg-white/[0.08] transition disabled:opacity-50"
      >
        {running ? "Running pipeline..." : "Run Pipeline Now"}
      </button>
      <p className="mt-2 text-xs text-court-500">
        Scrapes HHS + runs web search (if API keys set). New changes appear as pending updates.
      </p>
      {result && (
        <p className="mt-2 text-sm text-emerald-400">
          Pipeline complete: {result.total} pending updates created.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
