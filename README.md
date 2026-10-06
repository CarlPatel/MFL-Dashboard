# MFL Dashboard

A small mobile-first Next.js dashboard for following selected players in Vulture's Movies Fantasy League. It is designed for deployment to Vercel and works well when saved to an iPhone Home Screen.

## Data and privacy

All Vulture requests happen in `lib/vulture.ts` on the server. The browser calls the app's small `/api/search` and `/api/players` endpoints and never downloads or parses the full leaderboard. The server sends the documented `Referer`, `Accept`, and browser-style `User-Agent` headers. The parsed leaderboard is cached in server memory for one hour, with concurrent requests sharing the same in-flight download. (Next.js's persistent fetch cache cannot store this response because the decompressed item exceeds its per-item cache limit.) On Vercel, each warm function instance maintains its own cache; a new instance fetches once on its first request.

The source is Vulture's undocumented JSON endpoint:

`https://www.vulture.com/static/leaderboard/production/cmuec30my000h3b7egrtm2p6h.json`

Because this is an undocumented external dependency, its URL or response shape may change without notice.

## Saved dashboards

Saved players live in the shareable `?users=NameOne,NameTwo` URL parameter. Adding or removing a player updates that URL without a reload. The same list is stored in `localStorage`; when a URL does not include `users`, the saved browser list is restored.

On touch devices, pulling down from the top of the dashboard forces a fresh server-side leaderboard download and updates the saved player cards without reloading the page.

## Movie Score Inference

Vulture's leaderboard exposes each player's selected movies and total score, but not the point value of each movie. MFL Dashboard derives those values mathematically: every roster supplies an equation of the form `movie1 + movie2 + … + movie8 = player score`, and thousands of distinct rosters form a system of equations.

The server-side inference module:

1. Seeds every movie on a zero-point roster with a score of zero.
2. Repeatedly propagates known values through equations containing one unknown movie.
3. Uses row reduction to accept only uniquely identifiable remaining values.
4. Accepts only non-negative, effectively integer results.
5. Reconstructs player totals to validate the inferred mapping.
6. Leaves genuinely ambiguous movie scores unknown instead of guessing.

Inferred movie scores are derived data; Vulture's player total remains authoritative. The inference reuses the already-cached leaderboard and is cached for the same leaderboard version, so it does not make an additional Vulture request. Development diagnostics are available from `/api/debug/movie-scores`.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy to Vercel

Import this directory as a new Vercel project or run `vercel` from the project root. No database, secrets, cookies, or environment variables are required. The default Next.js build settings are sufficient.
