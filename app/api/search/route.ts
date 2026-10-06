import { NextRequest, NextResponse } from "next/server";

import { LeaderboardError, searchPlayers } from "../../../lib/vulture";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ results: [] });

  try {
    return NextResponse.json(await searchPlayers(query, 10));
  } catch (error) {
    console.error("Failed to search players", error);
    return NextResponse.json(
      { error: error instanceof LeaderboardError ? "Unable to load leaderboard right now." : "Unexpected server error." },
      { status: 502 },
    );
  }
}
