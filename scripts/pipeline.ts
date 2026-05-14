#!/usr/bin/env npx tsx
import { runScrape } from "./scrape";
import { runSearch } from "./search-salaries";

async function main() {
  console.log("=".repeat(60));
  console.log("WNBA Salary Pipeline");
  console.log("=".repeat(60));

  // Phase 1: HHS scrape
  console.log("\n[Phase 1] Running HHS scraper...");
  const scrapeCount = await runScrape();

  // Phase 2: Web search + AI extraction
  console.log("\n[Phase 2] Running web search...");
  const searchCount = await runSearch();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Pipeline complete:");
  console.log(`  HHS scrape:  ${scrapeCount} pending updates`);
  console.log(`  Web search:  ${searchCount} pending updates`);
  console.log(`  Total:       ${scrapeCount + searchCount} pending updates`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
