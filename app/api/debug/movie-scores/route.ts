import { NextResponse } from "next/server";

import { getCachedMovieScores } from "../../../../lib/movieScores";
import { getLeaderboard, LeaderboardError } from "../../../../lib/vulture";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();
    const inference = getCachedMovieScores(leaderboard.players, leaderboard.fetchedAt);
    return NextResponse.json({
      ...inference.diagnostics,
      unknownTitles: inference.unknownTitles,
      scores: Object.fromEntries(inference.scores),
      fetchedAt: leaderboard.fetchedAt,
    });
  } catch (error) {
    console.error("Failed to infer movie scores", error);
    return NextResponse.json(
      { error: error instanceof LeaderboardError ? "Unable to load leaderboard right now." : "Unexpected server error." },
      { status: 502 },
    );
  }
}
