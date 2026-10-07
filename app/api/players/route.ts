import { NextRequest, NextResponse } from "next/server";

import { getPlayers, LeaderboardError } from "../../../lib/vulture";

export async function GET(request: NextRequest) {
  const users = Array.from(
    new Map(
      (request.nextUrl.searchParams.get("users") ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 50)
        .map((name) => [name.toLocaleLowerCase(), name]),
    ).values(),
  );

  if (users.length === 0) {
    return NextResponse.json({ users: [], missing: [] });
  }

  try {
    return NextResponse.json(await getPlayers(users));
  } catch (error) {
    console.error("Failed to load players", error);
    return NextResponse.json(
      { error: error instanceof LeaderboardError ? "Unable to load leaderboard right now." : "Unexpected server error." },
      { status: 502 },
    );
  }
}
