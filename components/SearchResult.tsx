"use client";

import { useEffect, useState } from "react";
import type { Player, SearchPlayer } from "../lib/types";

export default function SearchResult({ player, saved, onAdd }: { player: SearchPlayer; saved: boolean; onAdd: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded || details) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/players?users=${encodeURIComponent(player.displayName)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load this player.");
        setDetails(data.users?.[0] ?? null);
        if (!data.users?.[0]) setError("Player not found.");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load this player.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [details, expanded, player.displayName]);

  return (
    <article className="search-result">
      <button className="result-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <strong>{player.displayName}</strong>
        <span>{player.score.toLocaleString()} pts <span className="chevron" aria-hidden="true">⌄</span></span>
      </button>
      {expanded && (
        <div className="result-details">
          {loading && <p className="muted">Loading player…</p>}
          {error && <p className="error-text">{error}</p>}
          {details && (
            <>
              <h3>Movies</h3>
              {details.movies.length ? <ul>{details.movies.map((movie) => <li key={movie}>{movie}</li>)}</ul> : <p className="muted">No movies listed.</p>}
              <button className="primary-button" disabled={saved} onClick={() => onAdd(player.displayName)}>{saved ? "Saved" : "Add to Dashboard"}</button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
