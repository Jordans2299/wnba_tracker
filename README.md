# WNBA Wage Tracker

A clean, modern Next.js site for browsing WNBA player salaries and contracts.

## Features

- **Sortable table** — sort by salary, player name, contract length, start, or end date
- **Real-time search** — filter players by name as you type
- **Team filter** — narrow the view to a single franchise
- **Asc/desc toggle** — flip the sort direction from anywhere
- **Summary stats** — players shown, highest salary, league average, total payroll
- **Bar chart** — visualize top salaries or switch to a chart-focused view
- **Responsive** — works cleanly from phone to desktop
- **Loading & empty states** — polished feedback throughout

## Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- Recharts

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data

Salary data is scraped daily from [Her Hoop Stats](https://herhoopstats.com/salary-cap-sheet/wnba/)
— the most reliable public source for WNBA contract data.

### How it works

- [`scripts/scrape.mjs`](scripts/scrape.mjs) fetches each of the 15 team
  cap-sheet pages, parses them with `cheerio`, and writes a consolidated
  [`data/salaries.json`](data/salaries.json).
- `lib/data.ts` imports that JSON at build time — no runtime HTTP calls,
  so there's no rate-limit risk and the app can be fully static.
- A GitHub Actions workflow ([`.github/workflows/scrape-salaries.yml`](.github/workflows/scrape-salaries.yml))
  runs the scraper on a daily cron (10:00 UTC) and commits the updated
  JSON if anything changed. Also triggerable manually from the Actions
  tab via **workflow_dispatch**.

### Run the scraper manually

```bash
npm run scrape
```

This rewrites `data/salaries.json`. Commit the change to publish.

### Derived fields

Her Hoop Stats publishes multi-year cap hits but not the original contract
signing date. `contractStart` / `contractEnd` / `contractLengthYears` are
derived from the run of consecutive signed years starting at the current
season — good enough for UX, not authoritative. Each player record also
includes the raw `yearlySalaries` array so you can surface year-by-year
breakdowns later if you want.

### Attribution

Data is sourced from Her Hoop Stats and is shown in the UI with a link
back to the source. Please keep that attribution if you fork.

## Structure

```
app/
  layout.tsx       # Root layout + metadata
  page.tsx         # Main page: state, filtering, sorting
  globals.css      # Tailwind + base styles
components/
  SalaryTable.tsx  # Sortable, responsive data table
  SalaryChart.tsx  # Recharts bar chart (top N or full view)
  StatsSummary.tsx # Top-of-page stat cards
  SearchBar.tsx
  TeamFilter.tsx
  ViewToggle.tsx   # Table ↔ Chart
lib/
  data.ts          # Mock player dataset
  utils.ts         # Formatting helpers
```
