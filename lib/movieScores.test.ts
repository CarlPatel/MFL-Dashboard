import { describe, expect, it } from "vitest";

import { inferMovieScores } from "./movieScores";
import type { Player } from "./types";

function player(movies: string[], score: number): Player {
  return { displayName: "Test", leagueName: null, ranking: null, movies, score };
}

describe("inferMovieScores", () => {
  it("infers every movie in a zero-score roster", () => {
    const result = inferMovieScores([player(["A", "B"], 0)]);
    expect(Object.fromEntries(result.scores)).toEqual({ A: 0, B: 0 });
  });

  it("propagates a known zero into another roster", () => {
    const result = inferMovieScores([player(["A", "B"], 0), player(["A", "C"], 10)]);
    expect(Object.fromEntries(result.scores)).toEqual({ A: 0, B: 0, C: 10 });
  });

  it("chains propagation across rosters", () => {
    const result = inferMovieScores([
      player(["A", "B"], 0),
      player(["B", "C"], 5),
      player(["C", "D"], 12),
    ]);
    expect(Object.fromEntries(result.scores)).toEqual({ A: 0, B: 0, C: 5, D: 7 });
  });

  it("deduplicates identical rosters with identical totals", () => {
    const result = inferMovieScores([player(["A", "B"], 10), player(["B", "A"], 10)]);
    expect(result.diagnostics.conflictingDuplicateRosters).toBe(0);
    expect(result.scores.get("A")).toBeNull();
    expect(result.scores.get("B")).toBeNull();
  });

  it("detects identical rosters with conflicting totals", () => {
    const result = inferMovieScores([player(["A", "B"], 10), player(["B", "A"], 20)]);
    expect(result.diagnostics.conflictingDuplicateRosters).toBe(1);
    expect(result.scores.get("A")).toBeNull();
    expect(result.scores.get("B")).toBeNull();
  });

  it("does not guess an underdetermined solution", () => {
    const result = inferMovieScores([player(["A", "B"], 10)]);
    expect(result.scores.get("A")).toBeNull();
    expect(result.scores.get("B")).toBeNull();
  });

  it("validates reconstructed roster totals", () => {
    const result = inferMovieScores([
      player(["A", "B"], 0),
      player(["A", "C"], 10),
      player(["B", "C"], 10),
    ]);
    expect(result.diagnostics.fullyReconstructableRosters).toBe(3);
    expect(result.diagnostics.correctlyReconstructedRosters).toBe(3);
    expect(result.diagnostics.inconsistentRosters).toBe(0);
  });

  it("solves uniquely identifiable values without a zero roster", () => {
    const result = inferMovieScores([
      player(["A", "B"], 10),
      player(["A", "C"], 12),
      player(["B", "C"], 14),
    ]);
    expect(Object.fromEntries(result.scores)).toEqual({ A: 4, B: 6, C: 8 });
  });

  it("does not expose scores implicated in a contradiction", () => {
    const result = inferMovieScores([
      player(["A", "B"], 0),
      player(["A"], 1),
    ]);
    expect(result.diagnostics.inconsistentRosters).toBe(1);
    expect(result.scores.get("A")).toBeNull();
    expect(result.scores.get("B")).toBe(0);
  });
});
