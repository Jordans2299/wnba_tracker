import salaryData from "@/data/salaries.json";

export type YearlySalary = {
  year: number;
  salary: number | null;
  status: string | null;
};

export type CareerEntry = {
  season: number;
  team: string;
  salary: number;
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
  profileSlug: string;
  photoUrl: string | null;
  careerEarnings: CareerEntry[];
  totalCareerEarnings: number;
};

export type TeamSummary = {
  name: string;
  urlSlug: string;
  salaryCap: number | null;
  totalSalaries: number | null;
  capRoom: number | null;
  guaranteedSalary: number | null;
  totalPlayers: number | null;
  openRosterSlots: number | null;
};

export type SalaryDataset = {
  source: string;
  season: number;
  lastUpdated: string;
  playerCount: number;
  players: Player[];
  teamSummaries: Record<string, TeamSummary>;
};

const dataset = salaryData as SalaryDataset;

export const players: Player[] = dataset.players.filter((p) => p.salary > 0);
export const allPlayers: Player[] = dataset.players;
export const teams: string[] = Array.from(new Set(players.map((p) => p.team))).sort();
export const teamSummaries: Record<string, TeamSummary> = dataset.teamSummaries;
export const meta = {
  source: dataset.source,
  season: dataset.season,
  lastUpdated: dataset.lastUpdated,
};
