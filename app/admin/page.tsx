import Link from "next/link";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import RunPipelineButton from "@/components/RunPipelineButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.pendingUpdates)
    .where(eq(schema.pendingUpdates.status, "pending"));

  const [playerResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.players);

  const [teamResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teams);

  const [salaryResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.playerSalaries);

  const pendingCount = pendingResult?.count ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Updates" value={String(pendingCount)} highlight={pendingCount > 0} />
        <StatCard label="Players" value={String(playerResult?.count ?? 0)} />
        <StatCard label="Teams" value={String(teamResult?.count ?? 0)} />
        <StatCard label="Salary Records" value={String(salaryResult?.count ?? 0)} />
      </div>

      {pendingCount > 0 && (
        <Link
          href="/admin/pending"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition mb-8"
        >
          Review {pendingCount} pending update{pendingCount !== 1 ? "s" : ""}
        </Link>
      )}

      <RunPipelineButton />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-accent/30 bg-accent/10" : "border-white/5 bg-white/[0.03]"}`}>
      <div className="text-xs uppercase tracking-wider text-court-300">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

