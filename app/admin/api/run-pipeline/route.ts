import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Dynamic import to avoid bundling the pipeline in the client
    const { runScrape } = await import("@/scripts/scrape");
    const scrapeCount = await runScrape();

    let searchCount = 0;
    if (process.env.BRAVE_API_KEY && process.env.ANTHROPIC_API_KEY) {
      const { runSearch } = await import("@/scripts/search-salaries");
      searchCount = await runSearch();
    }

    return NextResponse.json({
      ok: true,
      scrapeCount,
      searchCount,
      total: scrapeCount + searchCount,
    });
  } catch (err: any) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: err.message ?? "Pipeline failed" },
      { status: 500 }
    );
  }
}
