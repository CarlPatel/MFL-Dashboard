import "server-only";

import { getCachedMovieScores } from "./movieScores";
import type { Player, ScoredPlayer, SearchPlayer, VulturePlayer } from "./types";

const LEADERBOARD_URL =
  "https://www.vulture.com/static/leaderboard/production/cmuec30my000h3b7egrtm2p6h.json";

const REQUEST_HEADERS = {
  Accept: "*/*",
  Referer: "https://www.vulture.com/movies-league/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
};

export class LeaderboardError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LeaderboardError";
  }
}

type Leaderboard = { players: Player[]; fetchedAt: string };
type CacheEntry = Leaderboard & { expiresAt: number };

const CACHE_TTL_MS = 60 * 60 * 1000;
let memoryCache: CacheEntry | null = null;
let inFlightRequest: Promise<Leaderboard> | null = null;

function parseMovies(value: string): string[] {
  const movies: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      if (current.trim()) movies.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) movies.push(current.trim());
  return movies;
}

function normalizePlayer(value: unknown): Player | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as VulturePlayer;
  if (typeof raw.displayName !== "string" || !raw.displayName.trim()) return null;

  return {
    displayName: raw.displayName.trim(),
    leagueName:
      typeof raw.leagueName === "string" && raw.leagueName.trim()
        ? raw.leagueName.trim()
        : null,
    score: typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : 0,
    ranking:
      typeof raw.ranking === "number" && Number.isFinite(raw.ranking)
        ? raw.ranking
        : null,
    movies:
      typeof raw.movies === "string"
        ? parseMovies(raw.movies)
        : [],
  };
}

async function fetchLeaderboard(): Promise<Leaderboard> {
  let response: Response;
  try {
    response = await fetch(LEADERBOARD_URL, {
      headers: REQUEST_HEADERS,
      cache: "no-store",
    });
  } catch (error) {
    throw new LeaderboardError("Unable to reach Vulture.", { cause: error });
  }

  if (!response.ok) {
    throw new LeaderboardError(`Vulture returned ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new LeaderboardError("Vulture returned invalid JSON.", { cause: error });
  }

  if (!Array.isArray(payload)) {
    throw new LeaderboardError("Vulture returned an unexpected response shape.");
  }

  return {
    players: payload.map(normalizePlayer).filter((player): player is Player => player !== null),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getLeaderboard(): Promise<Leaderboard> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache;
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = fetchLeaderboard()
    .then((leaderboard) => {
      memoryCache = { ...leaderboard, expiresAt: Date.now() + CACHE_TTL_MS };
      return leaderboard;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export async function refreshLeaderboard(): Promise<Leaderboard> {
  memoryCache = null;
  inFlightRequest = null;
  return getLeaderboard();
}

export async function searchPlayers(query: string, limit = 10): Promise<{ results: SearchPlayer[]; fetchedAt: string }> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) return { results: [], fetchedAt: new Date().toISOString() };

  const leaderboard = await getLeaderboard();
  return {
    results: leaderboard.players
      .filter((player) => player.displayName.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, limit)
      .map(({ displayName, score }) => ({ displayName, score })),
    fetchedAt: leaderboard.fetchedAt,
  };
}

export async function getPlayers(usernames: string[]): Promise<{ users: ScoredPlayer[]; missing: string[]; fetchedAt: string }> {
  const leaderboard = await getLeaderboard();
  const inference = getCachedMovieScores(leaderboard.players, leaderboard.fetchedAt);
  const lookup = new Map(
    leaderboard.players.map((player) => [player.displayName.toLocaleLowerCase(), player]),
  );
  const users: ScoredPlayer[] = [];
  const missing: string[] = [];

  for (const username of usernames) {
    const player = lookup.get(username.toLocaleLowerCase());
    if (player) {
      users.push({
        ...player,
        movies: player.movies.map((title) => ({ title, score: inference.scores.get(title) ?? null })),
      });
    }
    else missing.push(username);
  }

  return { users, missing, fetchedAt: leaderboard.fetchedAt };
}
