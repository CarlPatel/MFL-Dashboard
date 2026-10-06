"use client";

import { useEffect, useState } from "react";
import type { SearchPlayer } from "../lib/types";
import SearchResult from "./SearchResult";

export default function PlayerSearch({ savedKeys, onAdd }: { savedKeys: Set<string>; onAdd: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function savePlayer(name: string) {
    onAdd(name);
    setQuery("");
    setResults([]);
    setError(null);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Unable to search right now.");
          setResults(Array.isArray(data.results) ? data.results : []);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setError(reason instanceof Error ? reason.message : "Unable to search right now.");
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const active = query.trim().length >= 2;
  return (
    <section className="search-section" aria-labelledby="search-heading">
      <label id="search-heading" htmlFor="player-search">Find a player</label>
      <div className="search-wrap">
        <span aria-hidden="true" className="search-icon">⌕</span>
        <input id="player-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players..." autoComplete="off" spellCheck={false} />
      </div>
      {active && (
        <div className="search-results" aria-live="polite">
          {loading && <p className="search-status">Searching…</p>}
          {error && <p className="search-status error-text">{error}</p>}
          {!loading && !error && results.length === 0 && <p className="search-status">No players found.</p>}
          {results.map((player) => <SearchResult key={player.displayName.toLocaleLowerCase()} player={player} saved={savedKeys.has(player.displayName.toLocaleLowerCase())} onAdd={savePlayer} />)}
        </div>
      )}
    </section>
  );
}
