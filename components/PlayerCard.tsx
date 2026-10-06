"use client";

import { useState } from "react";
import type { Player } from "../lib/types";

export default function PlayerCard({ player, onRemove }: { player: Player; onRemove: (name: string) => void }) {
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
          {player.movies.length ? <ul>{player.movies.map((movie) => <li key={movie}>{movie}</li>)}</ul> : <p className="muted">No movies listed.</p>}
          <button className="remove-button" onClick={() => onRemove(player.displayName)}>Remove from dashboard</button>
        </div>
      )}
    </article>
  );
}
