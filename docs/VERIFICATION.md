# Verification — 25 October 2026

## Executed checks

| Check | Result | Evidence / scope |
|---|---|---|
| Frontend TypeScript and production build | PASS | `npm run build`; Vite production output generated |
| Frontend automated tests | PASS | 15 tests: 8 queue tests and 7 audio-adapter lifecycle component tests |
| Backend build | PASS | .NET 8 API build; 0 warnings, 0 errors |
| Backend automated tests | PASS | 12 xUnit tests including password hashes, recommendations, validation, JWT authorization, playlist ownership/order, refresh rotation/reuse, library/history/settings/profile/logout/login roundtrip |
| PostgreSQL migrations generated | PASS | Initial migration, model snapshot and idempotent `backend/migrations.sql` |
| PostgreSQL migrations applied | PASS | GitHub Actions PostgreSQL 16 service; production EF migration applied at API startup |
| Running API HTTP smoke check | PASS | `/music/home`: 3 featured and 6 recommended real CC tracks; search returned Carefree; anonymous `/library`: 401 |
| Browser: real audio | PASS | Carefree loaded 3:25 duration; observed advancing position during navigation |
| Browser: search and detail routes | PASS | Kevin MacLeod search, artist page, six-track curated collection |
| Browser: personal library (guest) | PASS | Favorite, create playlist, insert two tracks, keyboard drag reorder, reload and verify order/favorite persisted |
| Browser: fullscreen | PASS | Expanded now-playing view, real current track/duration and queue rendered |
| Browser: responsive UI | PASS | Desktop and 390×844 CSS viewport inspected; mobile document width and scroll width both 375px excluding scrollbar; menu opened |
| Browser console | PASS within checked flows | No remaining app exception after UUID compatibility fix; browser extension diagnostic errors are unrelated |
| Account HTTP journey with PostgreSQL | PASS | GitHub Actions exercised registration, ownership, playlists/order, favorites, idempotent history, settings, logout/login and persisted library against PostgreSQL 16 |
| Playwright CLI suite | PASS | GitHub Actions: 4/4 tests passed across desktop and mobile; guest library/reorder/reload and artist/collection/language/fullscreen journeys |
| Official YouTube external playback/search | NOT RUN | No `YOUTUBE_API_KEY` supplied; iframe adapter and API provider implemented, live quota/region/embed behavior unverified |
| GitHub authentication | PASS | Connector returned login `energusss` |
| GitHub repository synchronization | PASS | Private `https://github.com/energusss/auralis`; original 13 source commits restored unchanged, followed by CI/repair commits |

## Implemented behavior

Global audio/official-visible-YouTube playback adapters; pause/resume, previous/next, seek, volume/mute, shuffle, repeat-one/all, queue insertion/removal/reordering and retry. Playback survives internal navigation. Reload restores queue/options and requires a fresh play gesture.

Typed discovery services, query caching, debounced categorized search with recent searches, artist and collection views, paginated provider search through a load-more action, profile editing, account settings, Polish/English UI, theme/accent preferences, responsive glass interface, Motion transitions, and reduced-motion support.

Guest library data persists in browser storage. Registered-account playlists/favorites/saved artists/saved albums/history/settings persist through the EF Core API. Authentication uses salted PBKDF2 hashes, short-lived JWTs and hashed rotating refresh tokens. Playlist authorization is scoped to the owner. Listening seconds reflect advancing audible playback; client-reported statistics are informational.

## Known limitations

- The default real catalog has six attributed Kevin MacLeod tracks; it is a demonstration selection, not a licensed mainstream catalog. Curated groupings are not claimed commercial albums. No measured trending/new-release data is fabricated by the default backend.
- YouTube Data API provides videos/channels/playlists. Complete YouTube Music albums/discographies and related-artist metada