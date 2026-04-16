import salaryData from "@/data/salaries.json";

export type YearlySalary = {
  year: number;
  salary: number | null;
  status: string | null;
};

export type Player = {
  id: string;
  name: string;
  team: string;
  salary: number;
  status: string | null;
  contractLengthYears: number;
  contractStart: string | null;
  contractEnd: string | null;
  yearlySalaries: YearlySalary[];
};

export type SalaryDataset = {
  source: string;
  season: number;
  lastUpdated: string;
  playerCount: number;
  players: Player[];
};

const dataset = salaryData as SalaryDataset;

/**
 * All players as scraped. Includes unsigned free agents with $0 current-year
 * salary — keep them out of the default UI but available for completeness.
 */
export const allPlayers: Player[] = dataset.players;

/** Players with a current-year cap hit — what the salary tracker shows. */
export const players: Player[] = dataset.players.filter((p) => p.salary > 0);

export const teams: string[] = Array.from(
  new Set(players.map((p) => p.team))
).sort();

export const meta = {
  source: dataset.source,
  season: dataset.season,
  lastUpdated: dataset.lastUpdated,
};
