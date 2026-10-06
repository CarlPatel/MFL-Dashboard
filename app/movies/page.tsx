import Link from "next/link";
import Image from "next/image";

import { getMovieCatalog } from "../../lib/vulture";

export const dynamic = "force-dynamic";

function pointLabel(score: number) {
  return `${score.toLocaleString()} ${score === 1 ? "pt" : "pts"}`;
}

export default async function MoviesPage() {
  const { movies, fetchedAt } = await getMovieCatalog();

  return (
    <main className="shell">
      <header className="header">
        <Link className="view-toggle" href="/">Dashboard</Link>
        <p className="eyebrow">Vulture</p>
        <h1>Movie Scores</h1>
        <p className="updated">Leaderboard refreshed {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</p>
      </header>

      <section aria-labelledby="movies-heading" className="dashboard-section movie-catalog-section">
        <div className="section-heading">
          <h2 id="movies-heading">All movies</h2>
          <span>{movies.length} titles</span>
        </div>
        <div className="movie-catalog">
          <div className="movie-catalog-header" aria-hidden="true">
            <span>Movie</span><span>Price</span><span>Score</span>
          </div>
          <ol>
            {movies.map((movie) => (
              <li key={movie.title}>
                <span className="movie-rank" aria-hidden="true" />
                {movie.posterUrl ? <Image className="movie-poster" src={movie.posterUrl} alt="" width={42} height={54} /> : <span className="movie-poster poster-placeholder" aria-hidden="true" />}
                <strong>{movie.title}</strong>
                <span className="movie-price">{movie.price === null ? "—" : `$${movie.price}`}</span>
                <span className="movie-score">{movie.score === null ? "—" : pointLabel(movie.score)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
