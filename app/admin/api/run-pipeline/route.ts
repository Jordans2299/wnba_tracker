import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  try {
    // The full pipeline (HHS scrape + web search) takes minutes and requires
    // cheerio which isn't bundled for serverless. It runs via GitHub Actions
    // or the CLI (npm run pipeline). This endpoint just returns current stats
    // so the admin dashboard can show pipeline status.
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.pendingUpdates)
      .where(eq(schema.pendingUpdates.status, "pending"));

    const [recent] = await db
      .select({
        count: sql<number>`count(*)`,
        latest: sql<string>`max(created_at)`,
      })
      .from(schema.pendingUpdates);

    return NextResponse.json({
      ok: true,
      pendingCount: pending?.count ?? 0,
      totalUpdatesEver: recent?.count ?? 0,
      lastPipelineRun: recent?.latest ?? null,
      message: "Run the pipeline via CLI (npm run pipeline) or wait for the daily GitHub Action.",
    });
  } catch (err: any) {
    console.error("Status check error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to check status" },
      { status: 500 }
    );
  }
}
