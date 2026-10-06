"use client";

import { useState } from "react";
import Image from "next/image";
import type { ScoredPlayer } from "../lib/types";

function pointLabel(score: number) {
  return `${score.toLocaleString()} ${score === 1 ? "pt" : "pts"}`;
}

export default function PlayerCard({ player, onRemove }: { player: ScoredPlayer; onRemove: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = `player-${player.displayName.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <article className={`player-card ${expanded ? "expanded" : ""}`}>
      <button className="card-toggle" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}>
        <span className="player-summary">
          <span><strong>{player.displayName}</strong><small>{player.ranking === null ? "Rank unavailable" : `Rank #${player.ranking.toLocaleString()}`}</small></span>
          <span className="score">{player.score.toLocaleString()} <small>pts</small></span>
        </span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </button>
      {expanded && (
        <div className="card-details" id={contentId}>
          {player.leagueName && <p className="league">{player.leagueName}</p>}
          <h3>Movies</h3>
          {player.movies.length ? (
            <ul className="movie-list">
              {player.movies.map((movie) => (
                <li key={movie.title}>
                  {movie.posterUrl ? <Image className="movie-poster movie-poster-small" src={movie.posterUrl} alt="" width={34} height={44} /> : <span className="movie-poster movie-poster-small poster-placeholder" aria-hidden="true" />}
                  <span>{movie.title}</span>
                  <strong>{movie.score === null ? "—" : pointLabel(movie.score)}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No movies listed.</p>}
          {player.movies.length > 0 && player.movies.every((movie) => movie.score !== null) && (
            <div className="movie-total"><span>Movie total</span><strong>{pointLabel(player.movies.reduce((sum, movie) => sum + (movie.score ?? 0), 0))}</strong></div>
          )}
          <button className="remove-button" onClick={() => onRemove(player.displayName)}>Remove from dashboard</button>
        </div>
      )}
    </article>
  );
}
