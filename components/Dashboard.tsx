"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ScoredPlayer } from "../lib/types";
import PlayerCard from "./PlayerCard";
import PlayerSearch from "./PlayerSearch";

const STORAGE_KEY = "mfl-dashboard-users";

function uniqueNames(names: string[]) {
  return Array.from(
    new Map(names.map((name) => name.trim()).filter(Boolean).map((name) => [name.toLocaleLowerCase(), name])).values(),
  );
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUsers = searchParams.get("users");
  const initialized = useRef(false);
  const [savedUsers, setSavedUsers] = useState<string[]>([]);
  const [players, setPlayers] = useState<Map<string, ScoredPlayer>>(new Map());
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const pullStartY = useRef<number | null>(null);

  const applyPlayersResponse = useCallback((data: { users?: ScoredPlayer[]; missing?: string[]; fetchedAt?: string }) => {
    setPlayers(new Map((data.users ?? []).map((player) => [player.displayName.toLocaleLowerCase(), player])));
    setMissing(Array.isArray(data.missing) ? data.missing : []);
    setFetchedAt(typeof data.fetchedAt === "string" ? data.fetchedAt : null);
  }, []);

  const writeUrl = useCallback((names: string[]) => {
    const params = new URLSearchParams(window.location.search);
    if (names.length) params.set("users", names.join(","));
    else params.delete("users");
    router.replace(`${window.location.pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (urlUsers !== null) {
      setSavedUsers(uniqueNames(urlUsers.split(",")));
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        const names = uniqueNames(stored.filter((value): value is string => typeof value === "string"));
        setSavedUsers(names);
        if (names.length) writeUrl(names);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [urlUsers, writeUrl]);

  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedUsers));
    if (!savedUsers.length) {
      setPlayers(new Map());
      setMissing([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/players?users=${encodeURIComponent(savedUsers.join(","))}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load leaderboard right now.");
        applyPlayersResponse(data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load leaderboard right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applyPlayersResponse, savedUsers]);

  const refreshPlayers = useCallback(async () => {
    if (!savedUsers.length || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/players?users=${encodeURIComponent(savedUsers.join(","))}&refresh=1`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to refresh leaderboard right now.");
      applyPlayersResponse(data);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to refresh leaderboard right now.");
    } finally {
      setRefreshing(false);
    }
  }, [applyPlayersResponse, refreshing, savedUsers]);

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    pullStartY.current = window.scrollY <= 0 ? event.touches[0]?.clientY ?? null : null;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (pullStartY.current === null || window.scrollY > 0 || refreshing) return;
    const distance = Math.max(0, (event.touches[0]?.clientY ?? pullStartY.current) - pullStartY.current);
    setPullDistance(Math.min(distance * 0.55, 96));
  }

  function handleTouchEnd() {
    const shouldRefresh = pullDistance >= 64;
    pullStartY.current = null;
    setPullDistance(0);
    if (shouldRefresh) void refreshPlayers();
  }

  const savedKeys = useMemo(() => new Set(savedUsers.map((name) => name.toLocaleLowerCase())), [savedUsers]);
  const sortedSavedUsers = useMemo(() => {
    return [...savedUsers].sort((left, right) => {
      const leftPlayer = players.get(left.toLocaleLowerCase());
      const rightPlayer = players.get(right.toLocaleLowerCase());
      if (leftPlayer && rightPlayer) {
        return rightPlayer.score - leftPlayer.score || leftPlayer.displayName.localeCompare(rightPlayer.displayName);
      }
      if (leftPlayer) return -1;
      if (rightPlayer) return 1;
      return left.localeCompare(right);
    });
  }, [players, savedUsers]);
  const addUser = useCallback((name: string) => {
    if (savedUsers.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    const next = [...savedUsers, name];
    setSavedUsers(next);
    writeUrl(next);
  }, [savedUsers, writeUrl]);
  const removeUser = useCallback((name: string) => {
    const next = savedUsers.filter((item) => item.toLocaleLowerCase() !== name.toLocaleLowerCase());
    setSavedUsers(next);
    writeUrl(next);
  }, [savedUsers, writeUrl]);

  return (
    <main className="shell" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className={`pull-indicator ${pullDistance > 0 ? "visible" : ""} ${refreshing ? "refreshing" : ""}`}
        style={{ transform: `translateY(${refreshing ? 10 : pullDistance - 42}px)` }}
        aria-live="polite"
      >
        <span aria-hidden="true">↻</span>
        {refreshing ? "Refreshing leaderboard…" : pullDistance >= 64 ? "Release to refresh" : "Pull to refresh"}
      </div>
      <header className="header">
        <p className="eyebrow">Vulture</p>
        <h1>Movies Fantasy League</h1>
        {fetchedAt && <p className="updated">Leaderboard refreshed {new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}
      </header>

      <PlayerSearch savedKeys={savedKeys} onAdd={addUser} />

      <section aria-labelledby="dashboard-heading" className="dashboard-section">
        <div className="section-heading">
          <h2 id="dashboard-heading">Your dashboard</h2>
          {savedUsers.length > 0 && <span>{savedUsers.length} saved</span>}
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}
        {loading && players.size === 0 && <div className="notice">Loading saved players…</div>}
        {!loading && savedUsers.length === 0 && (
          <div className="empty-state">
            <h3>No saved players yet</h3>
            <p>Search above to add players. Your dashboard is saved on this device and can be shared by URL.</p>
          </div>
        )}

        <div className="card-list">
          {sortedSavedUsers.map((name) => {
            const player = players.get(name.toLocaleLowerCase());
            if (player) return <PlayerCard key={name.toLocaleLowerCase()} player={player} onRemove={removeUser} />;
            if (missing.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
              return (
                <article className="player-card missing-card" key={name.toLocaleLowerCase()}>
                  <div><strong>{name}</strong><p>Player not found</p></div>
                  <button className="remove-button" onClick={() => removeUser(name)}>Remove</button>
                </article>
              );
            }
            return null;
          })}
        </div>
      </section>
    </main>
  );
}
