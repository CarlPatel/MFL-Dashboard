import { describe, expect, it } from "vitest";

import { MOVIE_METADATA, ORIGINAL_MOVIE_ORDER } from "./moviePrices";

describe("movie metadata", () => {
  it("loads every updated JSON movie with a usable poster", () => {
    expect(ORIGINAL_MOVIE_ORDER).toHaveLength(221);
    expect(MOVIE_METADATA.size).toBe(221);
    expect(ORIGINAL_MOVIE_ORDER.every((movie) => movie.posterUrl?.startsWith("https://"))).toBe(true);
  });
});
