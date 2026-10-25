# Development log

Work was implemented and continued on 25 October 2026. This log describes executed work; commit dates are actual checkpoint creation dates, not measurements of elapsed effort. The continuation instruction replaced the earlier request for a historical 48-hour timeline. No historical Git dates were assigned and no existing history was rewritten.

## Preserved implementation

The original React/Vite glass interface, Motion transitions, responsive styles, provider abstraction, PostgreSQL entity model, and API modules were retained. Initial working files existed without a Git repository. They were captured in logical commits during finalization.

## Finalization

- Corrected frontend TypeScript/JSX integration errors and catalog shape handling.
- Fixed non-secure preview-host UUID compatibility, playback races, source retry, media cleanup and language-change playback continuity.
- Checked search, artist/collection navigation, real Creative Commons audio, favorites, guest playlists, accessible reordering and reload persistence in the browser.
- Corrected empty-collection navigation, restored account preferences/search history, connected full account statistics and profile editing, and ensured local sign-out when a server request fails.
- Built .NET 8 API, corrected exception-response compilation and delayed configuration validation until test-host configuration is available.
- Generated the initial EF Core PostgreSQL migration, snapshot, and idempotent SQL script.
- Ran 15 frontend tests and 12 backend tests. Backend integration tests use a SQLite test database; they do not certify a PostgreSQL deployment.
- Verified the running HTTP API returns real catalog/search JSON and denies anonymous library access.
- Inspected desktop and 390px mobile UI. Added reproducible desktop/mobile Playwright specifications; these CLI specifications were not executed in this environment.

## Environment boundaries

The local .NET SDK required an environment-only process-information compatibility shim and single-node MSBuild. That shim and SDK are excluded from the deliverable. Normal Windows instructions use the standard .NET 8 SDK.

Docker and PostgreSQL were absent. Installing PostgreSQL was blocked by environment filesystem/identity restrictions. At that stage PostgreSQL schema application was unverified. A later GitHub Actions PostgreSQL 16 service verified migrations and the real HTTP account/persistence journey; a browser-authentication journey against PostgreSQL was not run. The browser preview uses the documented client fallback catalog when the API is unreachable; no backend account persistence is simulated in the browser.

## GitHub

The connected account was rechecked as `energusss`; the previous account is not the destination. `energusss/auralis` returned 404. The connector has content/commit operations but no repository-creation operation. Browser creation reaches a GitHub sign-in page. Publication requires that separate authentication (or the included authenticated GitHub CLI publishing script). Final synchronization status is recorded in `docs/VERIFICATION.md`.

The final browser-authentication inspection was rejected by automatic security review because it indicated `accounts.google.com`, outside the authorized GitHub origin. No attempt was made to bypass that review. Source delivery and all unaffected verification were completed.

## Publication completed

After the user signed in, `energusss/auralis` was created as a private repository. The original bundle imported the exact original 13 commit objects. The Actions token could upload objects but could not update a workflow-bearing ref; the already-authorized GitHub connector completed the ref update. Temporary bootstrap commits remain on `publication/bootstrap`, separate from application history.

GitHub Actions subsequently verified the standard backend build and tests and a PostgreSQL 16 HTTP persistence journey. Initial Playwright CI exposed a responsive test-selector mismatch and a real route-transition remount that cleared search input; both were repaired without redesigning the UI. Current results are in `docs/VERIFICATION.md`.

Final published-code CI passed: frontend production build and 15 automated tests, 4 desktop/mobile Playwright journeys, backend build and 12 tests, plus PostgreSQL 16 migrations and HTTP persistence verification. Run: https://github.com/energusss/auralis/actions/runs/40219895569.

## AURALIS v1.1 incremental update

- Corrected YouTube “All” search into separately typed video, channel and playlist results; preserved cursors for each category and blocked unplayable records at the player store boundary.
- Added artist profile links to track rows, the global player and expanded queue while keeping those links outside playback click targets.
- Moved the authorized YouTube iframe into expanded Now Playing. Starting a YouTube track opens that view; closing or pressing Escape pauses it. Native artwork remains for audio tracks and unavailable video is reported honestly.
- Added Google Identity Services sign-in. ASP.NET validates Google's OIDC signing keys and token claims; `sub` is stored with a unique database index. Matching existing accounts are linked only for Google-verified emails. The local email/password flow remains available.
- Added localized playlist search labels, AURALIS SVG favicon and Google OAuth configuration instructions.
- Local verification: frontend build and 18 tests passed; backend build and 14 tests passed. Playwright was attempted but this environment had no browser executable and its Chromium download was truncated. The new CI run is the browser-verification path. No Google OAuth ID or live YouTube key was provided, so those external-provider roundtrips remain unverified.
