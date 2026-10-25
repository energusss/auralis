# Verification — 25 October 2026

## Executed checks

| Check | Result | Evidence / scope |
|---|---|---|
| Frontend TypeScript and production build | PASS | `npm run build`; Vite production output generated |
| Frontend automated tests | PASS | 15 tests: 8 queue tests and 7 audio-adapter lifecycle component tests |
| Backend build | PASS | .NET 8 API build; 0 warnings, 0 errors |
| Backend automated tests | PASS | 12 xUnit tests including password hashes, recommendations, validation, JWT authorization, playlist ownership/order, refresh rotation/reuse, library/history/settings/profile/logout/login roundtrip |
| PostgreSQL migrations generated | PASS | Initial migration, model snapshot and idempotent `backend/migrations.sql` |
| PostgreSQL migrations applied | NOT RUN | Docker/PostgreSQL unavailable; package installation blocked by environment restrictions |
| Running API HTTP smoke check | PASS | `/music/home`: 3 featured and 6 recommended real CC tracks; search returned Carefree; anonymous `/library`: 401 |
| Browser: real audio | PASS | Carefree loaded 3:25 duration; observed advancing position during navigation |
| Browser: search and detail routes | PASS | Kevin MacLeod search, artist page, six-track curated collection |
| Browser: personal library (guest) | PASS | Favorite, create playlist, insert two tracks, keyboard drag reorder, reload and verify order/favorite persisted |
| Browser: fullscreen | PASS | Expanded now-playing view, real current track/duration and queue rendered |
| Browser: responsive UI | PASS | Desktop and 390×844 CSS viewport inspected; mobile document width and scroll width both 375px excluding scrollbar; menu opened |
| Browser console | PASS within checked flows | No remaining app exception after UUID compatibility fix; browser extension diagnostic errors are unrelated |
| Browser account journey with PostgreSQL | NOT RUN | API account journeys covered by SQLite integration tests; no claim of full deployed database verification |
| Playwright CLI suite | NOT RUN | Desktop/mobile specifications included for Windows/CI; interactive browser checks above were executed through the available browser controller |
| Official YouTube external playback/search | NOT RUN | No `YOUTUBE_API_KEY` supplied; iframe adapter and API provider implemented, live quota/region/embed behavior unverified |
| GitHub authentication | PASS | Connector returned login `energusss` |
| GitHub repository synchronization | BLOCKED | Repository returned 404, connector lacks creation operation, browser requires separate GitHub sign-in; automatic review blocked the Google-account origin during authentication inspection |

## Implemented behavior

Global audio/official-visible-YouTube playback adapters; pause/resume, previous/next, seek, volume/mute, shuffle, repeat-one/all, queue insertion/removal/reordering and retry. Playback survives internal navigation. Reload restores queue/options and requires a fresh play gesture.

Typed discovery services, query caching, debounced categorized search with recent searches, artist and collection views, paginated provider search through a load-more action, profile editing, account settings, Polish/English UI, theme/accent preferences, responsive glass interface, Motion transitions, and reduced-motion support.

Guest library data persists in browser storage. Registered-account playlists/favorites/saved artists/saved albums/history/settings persist through the EF Core API. Authentication uses salted PBKDF2 hashes, short-lived JWTs and hashed rotating refresh tokens. Playlist authorization is scoped to the owner. Listening seconds reflect advancing audible playback; client-reported statistics are informational.

## Known limitations

- The default real catalog has six attributed Kevin MacLeod tracks; it is a demonstration selection, not a licensed mainstream catalog. Curated groupings are not claimed commercial albums. No measured trending/new-release data is fabricated by the default backend.
- YouTube Data API provides videos/channels/playlists. Complete YouTube Music albums/discographies and related-artist metadata are not provided. The official embedded player remains visible and may show advertisements or refuse playback. No extraction, ad bypass, or access-control circumvention is implemented.
- Without a reachable API, discovery uses the explicitly identified local metadata catalog and guest persistence. Server/provider failures currently also fall back to this selection; results can consequently differ from live YouTube discovery.
- Lyrics have an honest unavailable state; no licensed lyrics provider is configured. No guaranteed gapless playback, offline downloads, proprietary recommendations, or password-recovery/email-verification flow is claimed.
- Search uses load-more pagination rather than automatic infinite scrolling. The visualizer is an animated playing indicator, not audio-frequency analysis. Initialization uses skeletons and page transitions, not a separate cinematic launch sequence.
- Guest history is capped at 2,000 intervals. Account library loads the most recent 100 intervals for recent listening; account statistics use the dedicated all-time endpoint. Interrupted final network heartbeats may be lost. Search history is saved after debouncing and can include intermediate queries.
- Tokens are stored in browser storage. Production deployment needs HTTPS, deployment security review, backup/restore verification and a decision about HttpOnly sessions. This release is not certified production-ready.
- Windows PowerShell and Docker Compose instructions are provided and reviewed; they were not executed on a Windows machine here.
- Vite reports a main JavaScript chunk of approximately 585 kB before gzip; bundle splitting remains an optimization opportunity.

See `README.md` for exact local startup and `DEVELOPMENT_LOG.md` for execution and timestamp details.

Publication continuation: create a private `energusss/auralis` repository and grant the connected GitHub integration access, or run `scripts/publish-github.ps1` using an authenticated local `gh` session. No remote repository or push is claimed.
