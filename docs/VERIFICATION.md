# Verification — 25 October 2026

The v1.0 and v1.1 results below are historical snapshots. The v2.0 section records the current playback design and latest verification, and supersedes earlier YouTube playback descriptions.

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
- YouTube Data API provides videos/channels/playlists. Complete YouTube Music albums/discographies and related-artist metadata are not provided. The official embedded player remains visible and may show advertisements or refuse playback. No extraction, ad bypass, or access-control circumvention is implemented.
- Without a reachable API, discovery uses the explicitly identified local metadata catalog and guest persistence. Server/provider failures currently also fall back to this selection; results can consequently differ from live YouTube discovery.
- Lyrics have an honest unavailable state; no licensed lyrics provider is configured. No guaranteed gapless playback, offline downloads, proprietary recommendations, or password-recovery/email-verification flow is claimed.
- Search uses load-more pagination rather than automatic infinite scrolling. The visualizer is an animated playing indicator, not audio-frequency analysis. Initialization uses skeletons and page transitions, not a separate cinematic launch sequence.
- Guest history is capped at 2,000 intervals. Account library loads the most recent 100 intervals for recent listening; account statistics use the dedicated all-time endpoint. Interrupted final network heartbeats may be lost. Search history is saved after debouncing and can include intermediate queries.
- Tokens are stored in browser storage. Production deployment needs HTTPS, deployment security review, backup/restore verification and a decision about HttpOnly sessions. This release is not certified production-ready.
- Windows PowerShell and Docker Compose instructions are provided and reviewed; they were not executed on a Windows machine here.
- Vite reports a main JavaScript chunk of approximately 585 kB before gzip; bundle splitting remains an optimization opportunity.

## v2.1 YouTube Music playback feasibility — 25 October 2026

| Check | Result | Evidence / scope |
|---|---|---|
| SimpMusic source and pinned `core` submodule review | PASS | Inspected player/queue service, player response scraper, cached format repository, expiry refresh, Android/JVM extractors, 403 fallback and GPL-3.0 license; source links and findings in `PROVIDER_RESEARCH.md`. Reference application was not built or run. |
| YouTube supported-playback policy review | PASS | Official policy disallows separating audio from video and background playback through YouTube API clients; the official embedded player remains the supported way to play the exact video. |
| YouTube Music direct audio resolution in Auralis | NOT IMPLEMENTED | Data API search results remain metadata-only. No `googlevideo` URL extraction, hidden iframe, proxy, signature/DRM bypass or downloader code was added. |
| Frontend automated tests | PASS | Local `npm test`: 17 tests across 3 files. |
| Frontend production build | PASS | Local `npm run build`; TypeScript check and Vite build succeeded. Existing ~587 kB minified bundle warning remains. |
| Backend build and tests in this workspace | BLOCKED | .NET SDK is not installed (`dotnet: command not found`). The unchanged backend and frontend code passed GitHub Actions run [40232423328](https://github.com/energusss/auralis/actions/runs/40232423328), including backend tests, PostgreSQL migration/API checks, frontend tests and Playwright. |
| Real YouTube Music playback | NOT AVAILABLE / NOT VERIFIED | No authorized audio source exists for these YouTube metadata records. Prior real-stream checks cover the separate Kevin MacLeod/Incompetech CC BY catalog, not YouTube tracks. No Jamendo or Apple Music credentials are configured. |

No Auralis application code or UI was changed in v2.1: the requested background audio-only YouTube playback cannot be implemented with the reviewed official YouTube interfaces. See `PROVIDER_RESEARCH.md` for the precise SimpMusic resolver path, policy boundary, and alternative authorized provider options.

See `README.md` for exact local startup and `DEVELOPMENT_LOG.md` for execution and timestamp details.

Publication completed after the user signed in to GitHub. The original history was transported in a verified Git bundle; the connected GitHub integration set `main` to the exact original commit. The temporary bootstrap is archived on `publication/bootstrap`. Subsequent commits use actual creation timestamps.

Published-code CI: https://github.com/energusss/auralis/actions/runs/40219895569 — frontend and backend builds, 15 frontend tests, 12 backend tests, 4 Playwright tests and the PostgreSQL migration/HTTP journey passed.

## v1.1 incremental update — 25 October 2026

| Check | Result | Evidence / scope |
|---|---|---|
| Frontend TypeScript and production build | PASS | `npm run build`; favicon appears in `frontend/dist` |
| Frontend unit/component tests | PASS | 18 tests, including non-playable artist guards, category-preserving search, and official YouTube iframe mount/destroy lifecycle |
| Backend API build | PASS | .NET 8, 0 warnings and 0 errors |
| Backend tests | PASS | 14 xUnit tests, including YouTube all-category classification and Google sign-in disabled-state behavior |
| Git diff hygiene | PASS | `git diff --check` |
| Playwright desktop and mobile | PASS | GitHub Actions installed Chromium and passed all 4 end-to-end journeys (2 journeys across desktop and iPhone viewport) in run [40227102638](https://github.com/energusss/auralis/actions/runs/40227102638). The local Work container still has no usable browser binary; its download was truncated. |
| Google OAuth live roundtrip | NOT RUN | No Google OAuth client ID was supplied. The secure token-validation and account-linking path is implemented; configure the matching public/client IDs as shown in README. |
| Live YouTube iframe | NOT RUN | No YouTube Data API credential/video was configured. The official iframe remains visible and interactive in expanded Now Playing; close pauses playback. |

Changes add stable typed artist/channel discovery, artist profile links from track rows and current playback, the localized “Playlisty / Playlists” search label, AURALIS favicon, expanded-only official YouTube video presentation, and Google Identity Services authentication backed by verified Google OIDC tokens. Existing local password login and library schema are retained; the new nullable unique Google subject is added by an EF migration.

Full published-code CI: [run 40227102638](https://github.com/energusss/auralis/actions/runs/40227102638) — frontend build, 18 unit/component tests, 4 desktop/mobile Playwright journeys, backend build, 14 xUnit tests, PostgreSQL migration and account persistence smoke check all passed.

## v2.0 music-first playback upgrade — 25 October 2026

| Check | Result | Evidence / scope |
|---|---|---|
| Frontend TypeScript and production build | PASS | `npm run build`; Vite production bundle generated |
| Frontend unit tests | PASS | 17 tests across player, search API and persistent-audio lifecycle suites |
| Playwright test discovery | PASS | Six journeys discovered for desktop and mobile, including a live MP3 progression test |
| Playwright browser execution in this workspace | BLOCKED | No Chromium binary was installed. The Playwright browser download returned a zero-byte archive; browser flows are not reported as locally verified. |
| Backend build and tests in this workspace | BLOCKED | .NET SDK is not installed; `dotnet test` could not start. Run the repository CI after push for backend verification. |
| Live authorized audio endpoint | PASS | Incompetech Carefree returned HTTP 206 for a byte range; `ffprobe` identified MP3, 44.1 kHz stereo, 205.14 s; FFmpeg decoded one second without errors. This verifies the source stream, not browser playback. |
| Google and PostgreSQL regressions | NOT RUN LOCALLY | Authentication and database code were not modified; confirm the repository CI run after publication. |

The app now uses a single persistent HTMLAudioElement controlled by the Zustand player actions. Seeking, volume, queue transitions, retry and Media Session commands use that element; route changes and opening/closing Now Playing leave it intact. YouTube Data API tracks are explicitly metadata-only and cannot enter the playback queue. The expanded view always uses artwork and no YouTube iframe. The current directly playable provider is the curated Kevin MacLeod CC BY catalog. SimpMusic's persistent service/queue separation was reviewed; its GPL-3.0 code was not copied and its unofficial stream resolver was not adopted.

The new Playwright journey exercises the real Incompetech URL and checks position advancement across route and Now Playing transitions. GitHub Actions run 40232423328 passed the frontend E2E suite with Chromium; local browser execution remains blocked because this workspace could not install Chromium.
