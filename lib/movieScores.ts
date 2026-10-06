import type { Player } from "./types";

type InferenceInput = Pick<Player, "score" | "movies">;

type Equation = {
  movies: string[];
  totalScore: number;
};

export type MovieScoreDiagnostics = {
  leaderboardEntries: number;
  uniqueMovies: number;
  knownMovies: number;
  unknownMovies: number;
  validRosters: number;
  fullyReconstructableRosters: number;
  correctlyReconstructedRosters: number;
  inconsistentRosters: number;
  conflictingDuplicateRosters: number;
};

export type MovieScoreInference = {
  scores: Map<string, number | null>;
  diagnostics: MovieScoreDiagnostics;
  unknownTitles: string[];
};

const EPSILON = 1e-8;
const INTEGER_EPSILON = 1e-6;

let cachedInference: { leaderboardVersion: string; result: MovieScoreInference } | null = null;

function normalizeRoster(player: InferenceInput): Equation | null {
  if (!Number.isFinite(player.score) || !Array.isArray(player.movies)) return null;
  const movies = Array.from(
    new Set(player.movies.filter((movie): movie is string => typeof movie === "string").map((movie) => movie.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
  if (!movies.length) return null;
  return { movies, totalScore: player.score };
}

function propagate(equations: Equation[], known: Map<string, number>) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const equation of equations) {
      let remaining = equation.totalScore;
      const unknown: string[] = [];
      for (const movie of equation.movies) {
        const score = known.get(movie);
        if (score === undefined) unknown.push(movie);
        else remaining -= score;
      }
      if (unknown.length !== 1) continue;
      const rounded = Math.round(remaining);
      if (remaining >= -INTEGER_EPSILON && Math.abs(remaining - rounded) < INTEGER_EPSILON) {
        const movie = unknown[0];
        if (!known.has(movie)) {
          known.set(movie, rounded);
          changed = true;
        }
      }
    }
  }
}

function solveUniquelyIdentifiable(equations: Equation[], unresolved: string[], known: Map<string, number>) {
  if (!unresolved.length) return;
  const index = new Map(unresolved.map((title, position) => [title, position]));
  const size = unresolved.length;
  const matrix = Array.from({ length: size }, () => new Float64Array(size + 1));

  // AᵀA x = Aᵀb has the same solution space as a consistent A x = b,
  // while keeping the dense fallback bounded by the number of movie titles.
  for (const equation of equations) {
    let remaining = equation.totalScore;
    const columns: number[] = [];
    for (const movie of equation.movies) {
      const score = known.get(movie);
      if (score === undefined) {
        const column = index.get(movie);
        if (column !== undefined) columns.push(column);
      } else {
        remaining -= score;
      }
    }
    if (!columns.length) continue;
    for (const row of columns) {
      matrix[row][size] += remaining;
      for (const column of columns) matrix[row][column] += 1;
    }
  }

  const pivotColumns: number[] = [];
  let pivotRow = 0;
  for (let column = 0; column < size && pivotRow < size; column += 1) {
    let bestRow = pivotRow;
    for (let row = pivotRow + 1; row < size; row += 1) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[bestRow][column])) bestRow = row;
    }
    if (Math.abs(matrix[bestRow][column]) < EPSILON) continue;
    [matrix[pivotRow], matrix[bestRow]] = [matrix[bestRow], matrix[pivotRow]];
    const pivot = matrix[pivotRow][column];
    for (let cell = column; cell <= size; cell += 1) matrix[pivotRow][cell] /= pivot;
    for (let row = 0; row < size; row += 1) {
      if (row === pivotRow || Math.abs(matrix[row][column]) < EPSILON) continue;
      const factor = matrix[row][column];
      for (let cell = column; cell <= size; cell += 1) matrix[row][cell] -= factor * matrix[pivotRow][cell];
    }
    pivotColumns[pivotRow] = column;
    pivotRow += 1;
  }

  const freeColumns = new Set<number>();
  const pivotSet = new Set(pivotColumns);
  for (let column = 0; column < size; column += 1) if (!pivotSet.has(column)) freeColumns.add(column);

  for (let row = 0; row < pivotRow; row += 1) {
    const column = pivotColumns[row];
    let dependsOnFreeVariable = false;
    for (const freeColumn of freeColumns) {
      if (Math.abs(matrix[row][freeColumn]) >= EPSILON) {
        dependsOnFreeVariable = true;
        break;
      }
    }
    if (dependsOnFreeVariable) continue;
    const value = matrix[row][size];
    const rounded = Math.round(value);
    if (value >= -INTEGER_EPSILON && Math.abs(value - rounded) < INTEGER_EPSILON) {
      known.set(unresolved[column], rounded);
    }
  }
}

export function inferMovieScores(players: InferenceInput[]): MovieScoreInference {
  const validEquations = players.map(normalizeRoster).filter((equation): equation is Equation => equation !== null);
  const movieTitles = Array.from(new Set(validEquations.flatMap((equation) => equation.movies))).sort((a, b) => a.localeCompare(b));
  const rosterTotals = new Map<string, Set<number>>();
  const uniqueEquations = new Map<string, Equation>();

  for (const equation of validEquations) {
    const key = equation.movies.join("\u0000");
    const totals = rosterTotals.get(key) ?? new Set<number>();
    totals.add(equation.totalScore);
    rosterTotals.set(key, totals);
    if (!uniqueEquations.has(`${key}\u0001${equation.totalScore}`)) {
      uniqueEquations.set(`${key}\u0001${equation.totalScore}`, equation);
    }
  }

  const conflictingKeys = new Set(
    Array.from(rosterTotals.entries()).filter(([, totals]) => totals.size > 1).map(([key]) => key),
  );
  const consistentEquations = Array.from(uniqueEquations.values()).filter(
    (equation) => !conflictingKeys.has(equation.movies.join("\u0000")),
  );
  const known = new Map<string, number>();

  for (const equation of consistentEquations) {
    if (equation.totalScore === 0) {
      for (const movie of equation.movies) known.set(movie, 0);
    }
  }

  propagate(consistentEquations, known);
  const unresolved = movieTitles.filter((title) => !known.has(title));
  solveUniquelyIdentifiable(consistentEquations, unresolved, known);
  propagate(consistentEquations, known);

  const scores = new Map<string, number | null>(movieTitles.map((title) => [title, known.get(title) ?? null]));
  const contradictoryTitles = new Set<string>();
  let inconsistentRosters = 0;
  for (const equation of validEquations) {
    const values = equation.movies.map((movie) => scores.get(movie));
    if (values.some((value) => value === null || value === undefined)) continue;
    const predicted = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    if (predicted !== equation.totalScore) {
      inconsistentRosters += 1;
      for (const movie of equation.movies) contradictoryTitles.add(movie);
    }
  }
  // Never expose a value implicated in a contradiction as if it were reliable.
  for (const title of contradictoryTitles) scores.set(title, null);

  let fullyReconstructableRosters = 0;
  let correctlyReconstructedRosters = 0;
  for (const equation of validEquations) {
    const values = equation.movies.map((movie) => scores.get(movie));
    if (values.some((value) => value === null || value === undefined)) continue;
    fullyReconstructableRosters += 1;
    const predicted = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    if (predicted === equation.totalScore) correctlyReconstructedRosters += 1;
  }

  const unknownTitles = movieTitles.filter((title) => scores.get(title) === null);
  return {
    scores,
    unknownTitles,
    diagnostics: {
      leaderboardEntries: players.length,
      uniqueMovies: movieTitles.length,
      knownMovies: movieTitles.length - unknownTitles.length,
      unknownMovies: unknownTitles.length,
      validRosters: validEquations.length,
      fullyReconstructableRosters,
      correctlyReconstructedRosters,
      inconsistentRosters,
      conflictingDuplicateRosters: conflictingKeys.size,
    },
  };
}

export function getCachedMovieScores(players: InferenceInput[], leaderboardVersion: string): MovieScoreInference {
  if (cachedInference?.leaderboardVersion === leaderboardVersion) return cachedInference.result;
  const result = inferMovieScores(players);
  cachedInference = { leaderboardVersion, result };
  return result;
}
