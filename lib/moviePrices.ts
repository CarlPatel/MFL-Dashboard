import originalData from "../app/movies/original-data.json";

export type MovieMetadata = {
  title: string;
  price: number;
  posterUrl: string | null;
  tieBreakOrder: number;
};

export const DEFAULT_POSTER_URL =
  "https://pyxis.nymag.com/v1/imgs/eff/1c6/58bc36b05d0474304b28433c8ad0a597d2-MFL-TK-poster.png";

type OriginalMovie = {
  Movie?: unknown;
  Price?: unknown;
  "Poster Image"?: unknown;
};

export const MOVIE_METADATA = new Map<string, MovieMetadata>();

for (const [tieBreakOrder, rawMovie] of (originalData.movies as OriginalMovie[]).entries()) {
  if (typeof rawMovie.Movie !== "string" || !rawMovie.Movie.trim() || typeof rawMovie.Price !== "number") continue;
  const title = rawMovie.Movie.trim();
  MOVIE_METADATA.set(title, {
    title,
    price: rawMovie.Price,
    posterUrl: typeof rawMovie["Poster Image"] === "string" && rawMovie["Poster Image"].trim()
      ? rawMovie["Poster Image"].trim()
      : DEFAULT_POSTER_URL,
    tieBreakOrder,
  });
}

export const ORIGINAL_MOVIE_ORDER = Array.from(MOVIE_METADATA.values());
