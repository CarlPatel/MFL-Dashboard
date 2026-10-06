export type VulturePlayer = {
  displayName?: unknown;
  leagueName?: unknown;
  score?: unknown;
  movies?: unknown;
  ranking?: unknown;
  [key: string]: unknown;
};

export type Player = {
  displayName: string;
  leagueName: string | null;
  score: number;
  ranking: number | null;
  movies: string[];
};

export type SearchPlayer = Pick<Player, "displayName" | "score">;
