# Music-provider investigation

Research performed 25 October 2026. This is a targeted source and architecture review, not a full audit or a claim that the reference applications were built or run. No source code from these projects was copied into Auralis. Repository HEADs can change; the inspected tree identifiers below record this review.

## Auralis v2.3 playback restoration

Current implementation: YouTube Data API results marked `official-player` are routed to one app-shell-lifetime IFrame API player, visible in a responsive dock whenever a YouTube item is active. The dock remains mounted through route changes and meets the API's 200×200 minimum viewport. Queue controls, seek, volume, Media Session, and audible-time history are synchronized with its player state. Direct audio (including resolved Internet Archive MP3s) continues through the existing singleton HTMLAudioElement. A mixed queue pauses the outgoing adapter before switching to the other provider. Metadata-only records remain unplayable.

This restores the earlier Auralis IFrame adapter behavior from commit `0b9fd5e`, with the fuller floating player presentation last present in `159ddda`, without restoring their older per-track audio lifecycle. YouTube playback is official embedded **video** playback; it is not audio-only/background YouTube Music playback. Videos may be unavailable, blocked from embedding, region-restricted, or stopped by browser/OS policies. See the Google IFrame Player requirements: its viewport must be at least 200×200 pixels; the current dock is visible and larger than that minimum while the provider is active.

The v2.2 paragraphs below describe the earlier metadata-only release decision and source research, not the current queue behavior. That release boundary remains relevant to direct-audio extraction: Auralis does not extract YouTube CDN URLs or copy GPL SimpMusic code.

## Reference projects

### 1. th-ch/youtube-music → Pear Desktop

The requested URL now redirects to [pear-devs/pear-desktop](https://github.com/pear-devs/pear-desktop). Inspected tree: `7c55260773c7d8477d6b3339f36a9a3eff9ae112`.

This is an Electron desktop architecture, rather than an independent licensed music API. `src/index.ts` constructs a BrowserWindow, loads the music web application, manages configuration and IPC, and initializes extensions. `src/preload.ts` bridges the renderer and native environment. This architecture benefits from the existing web application's discovery and player, with desktop extensions layered around it. It is not directly portable into an ASP.NET-hosted web application: browser origin isolation and web security differ from a controlled Electron shell.

Useful lesson: isolate playback lifecycle, settings, and optional enhancements. Auralis does not adopt ad-blocking, downloading, browser impersonation, or injected access-control workarounds.

Sources: [entry point](https://github.com/pear-devs/pear-desktop/blob/master/src/index.ts), [preload](https://github.com/pear-devs/pear-desktop/blob/master/src/preload.ts), [repository](https://github.com/th-ch/youtube-music).

### 2. SimpMusic

Inspected SimpMusic commit `068d74435f0cf0e8552af3da07879eafd328fea7` on `dev`; its gitlink pins `maxrave-dev/core` commit `2894e549763b8a68225b4456d3290f3227bdbb01`. Both repositories declare GPL-3.0. This review read the submodule's stream repository, common scraper, Android and JVM extractor implementations, audio format model and Media3 service; it did not build or run SimpMusic.

**Verified stream path:** the common `YouTube.player(videoId)` request produces a `PlayerResponse`. `StreamRepositoryImpl` selects an audio format using configured quality/itag and available adaptive formats; its cached `NewFormatEntity` records codec, MIME type, bitrate, sample rate, content length, audio URL and `expiredTime`. The expiry is computed from `streamingData.expiresInSeconds`; `updateFormat` fetches a new player response when the saved expiry has passed. `invalidateFormat` marks the cached row expired. `is403Url` delegates URL checking to the scraper. Audio URLs are emitted with `cpn` and byte `range` parameters (or as a manifest URL). These are extracted YouTube CDN URLs, not a public/authorized Auralis API contract.

**Verified extraction/error path:** the core's Android and JVM `Extractor` actuals try PipePipe with a local Faraday cipher decoder, then PipePipe with its remote `api.pipepipe.dev` decoder, then BravePipe. The source comments explicitly describe stale signatures rejected by the CDN and a 403 fallback. This is upstream-specific stream extraction/cipher solving; it is not an ordinary provider URL refresh and is outside Auralis's requested boundary. The backend cannot safely reproduce it by returning a `googlevideo` URL to HTMLAudioElement. Such URLs are short-lived, token/context-sensitive and can return 403; browser CORS and status visibility also prevent dependable HTTP-level diagnosis from a cross-origin media element.

**Verified player/lifecycle path:** SimpMusic separates common song/queue models and stream repository from its Compose screens. Its Android Media3 `MediaLibraryService` owns a player and `MediaSession`; platform-specific Android/JVM implementations and Android storage/coroutines supply behavior that cannot be copied directly to this browser app. Transferable patterns are provider/repository separation, one app-lifetime player, persisted queue, stream expiry metadata, bounded refresh and explicit error state. Auralis already has the single persistent HTMLAudioElement and queue across routes; its direct-source queue cannot consume a YouTube ID unless an authorized audio URL exists.

No SimpMusic or core source was copied. Using GPL-3.0 implementation code in Auralis would require evaluating and meeting GPL distribution/source obligations for the resulting combined work; architectural ideas do not require copying that code.

Sources: [SimpMusic commit](https://github.com/maxrave-dev/SimpMusic/tree/068d74435f0cf0e8552af3da07879eafd328fea7), [submodule pointer](https://github.com/maxrave-dev/SimpMusic/blob/068d74435f0cf0e8552af3da07879eafd328fea7/.gitmodules), [pinned core stream repository](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/data/src/commonMain/kotlin/com/maxrave/data/repository/StreamRepositoryImpl.kt), [player response scraper](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/service/kotlinYtmusicScraper/src/commonMain/kotlin/com/maxrave/kotlinytmusicscraper/YouTube.kt), [Android extractor](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/service/kotlinYtmusicScraper/src/androidMain/kotlin/com/maxrave/kotlinytmusicscraper/extractor/Extractor.android.kt), [JVM extractor](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/service/kotlinYtmusicScraper/src/jvmMain/kotlin/com/maxrave/kotlinytmusicscraper/extractor/Extractor.jvm.kt), [audio format model](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/domain/src/commonMain/kotlin/com/maxrave/domain/data/model/streams/AudioStream.kt), [Media3 service](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/media/media3/src/main/java/com/maxrave/media3/service/SimpleMediaService.kt).

## Auralis v2.2 playback implementation (historical)

The existing YouTube Data API path remains metadata-only. Its video IDs are not direct audio sources. Auralis does not run SimpMusic's YouTube CDN extraction or cipher-solving stack in this browser application: the URLs are short-lived/context-bound, may fail with 403, and are not a supported direct-audio response. No GPL implementation code was copied.

A separate **Open audio** search uses Internet Archive's Advanced Search and item metadata APIs. It lists MP3 files only when the item metadata declares CC0, CC BY 3.0/4.0, or CC BY-SA 3.0/4.0. Discovery returns a metadata record marked `resolvable` with no URL. The ASP.NET resolver re-reads/caches item metadata, validates the identifier, file name hash, MP3 extension/source, and allowlisted license, then returns an HTTPS archive download URL (`audio/mpeg`). The existing global HTMLAudioElement plays that URL; this source supports HTTP byte ranges and CORS. Archive files are stable and this provider does not report an expiry time. A subsequent user play action resolves the URL again, so the app does not persist a short-lived URL in search metadata.

The Archive license statement is uploader-supplied and is **not independently verified** by the Archive or Auralis. The interface says so and provides the license/item links in the track model; users must verify rights before reuse. The app streams the Archive-hosted MP3 and does not download/rehost it. Search results are item-metadata-based (album/creator titles); some individual track-name searches may not match when the Archive does not index file names. Open-audio results are deliberately separate from YouTube results and do not claim to be a YouTube Music substitute.

The resolver contract records track/provider, availability, URL, MIME type, codec, expiry, failure category, retry eligibility, license and source page. Unknown providers and non-allowlisted records fail closed. Archive calls use a four-request concurrency cap, in-memory metadata cache, finite timeout, one bounded retry for 429/5xx, and an API rate-limit policy. Playback is not marked playable until resolution returns an HTTPS source.

Live verification is wired into CI: it searches the real `Directionless EP` Archive record, resolves the `Night Owl` MP3, requests its first byte range, checks MP3 framing, then the browser E2E test listens to that URL while navigating to the artist page. This is distinct from the existing six Incompetech demo MP3s. The test may fail if the upstream Archive catalog or media host is unavailable.

### 3. ytmusicapi

Python metadata client which emulates YouTube Music web requests. Inspected `ytmusicapi/mixins/browsing.py`. Its browsing mixin uses `browse` and continuation responses to assemble typed-in-practice dictionaries for home shelves, artists, albums, songs, related content, and lyrics. Artist results distinguish songs, albums, singles, videos and related artists; release lists include continuation parameters. The same module exposes player-response data, which is distinct from an authorized player integration.

Useful lesson: keep stable provider IDs, thumbnails, artist references and album references; pagination is provider-specific. This is richer music metadata than the official Data API. It is unofficial, however, and a successful metadata response does not grant redistribution or extraction rights. Auralis does not use cookie replay or streaming-data extraction.

Sources: [repository](https://github.com/sigma67/ytmusicapi), [browsing implementation](https://github.com/sigma67/ytmusicapi/blob/main/ytmusicapi/mixins/browsing.py).

### 4. InnerTune

Inspected tree: `bfba5ecb16795cfc93ecce73d94ca583bcec917c` on `dev`. The Android app separates an `innertube` module from application code. `MusicService.kt` integrates Android Media3/ExoPlayer, MediaLibraryService, playback statistics, queue state and caching/resolving data sources. `SongEntity.kt` stores ID, title, duration, thumbnail, album references, liked status and total listening time.

Useful lesson: metadata identity, persisted library state and runtime playback are separate concerns. Playback events should drive history and statistics. Its native extraction/resolution path is outside Auralis's authorized playback boundary; Auralis keeps YouTube results metadata-only and uses authorized direct-audio URLs for playback.

Sources: [repository](https://github.com/z-huang/InnerTune), [service](https://github.com/z-huang/InnerTune/blob/dev/app/src/main/java/com/zionhuang/music/playback/MusicService.kt), [song entity](https://github.com/z-huang/InnerTune/blob/dev/app/src/main/java/com/zionhuang/music/db/entities/SongEntity.kt).

### 5. spotDL

Inspected tree: `cd4a4203f5b12bd6dbbdf22d7674807858d35e05` on `master`. spotDL matches Spotify song metadata to candidate audio sources and downloads results. Its `YouTubeMusic` provider inherits `AudioProvider`, uses ytmusicapi for search, and normalizes candidates into `Result` objects. `Song` models include artists, album, genres and source identity.

Useful lesson: normalize provider results and preserve provenance; a title match is not authoritative track identity. The downloader workflow is not a licensed streaming service and is deliberately not adopted. No spotDL runtime dependency is included.

Sources: [repository](https://github.com/spotDL/spotify-downloader), [YouTube Music provider](https://github.com/spotDL/spotify-downloader/blob/master/spotdl/providers/audio/ytmusic.py), [song models](https://github.com/spotDL/spotify-downloader/blob/master/spotdl/types/song.py).

### 6. Metrolist

Inspected tree: `6d08504262de76a4ba841dc24489a754e2f48e4f` on `main`. Its Android app separates application persistence/playback from an Innertube module. `YouTube.kt` maps upstream renderer structures into song, album, artist, search, home, charts, and continuation page models. `MusicService.kt` integrates Media3/ExoPlayer and coroutine state. The development guide identifies separately configured Last.fm credentials.

Useful lesson: separate upstream response parsing from application models and handle continuations explicitly. Its Innertube playback/extraction mechanisms are not included in Auralis.

Sources: [repository](https://github.com/MetrolistGroup/Metrolist), [metadata facade](https://github.com/MetrolistGroup/Metrolist/blob/main/innertube/src/main/kotlin/com/metrolist/innertube/YouTube.kt), [playback service](https://github.com/MetrolistGroup/Metrolist/blob/main/app/src/main/kotlin/com/metrolist/music/playback/MusicService.kt), [development guide](https://github.com/MetrolistGroup/Metrolist/blob/main/development_guide.md).

## Auralis v2.1 feasibility decision — 25 October 2026

The current YouTube Data API integration returns video/channel/playlist metadata; it does not return playable audio URLs. The official YouTube API policies prohibit API clients from extracting or isolating audio from video and from allowing YouTube video playback in the background. The official embedded player must remain visible and un-obscured. That official player is the closest supported way to play the exact discovered YouTube video, but it cannot meet Auralis's requested artwork-only, persistent background music experience. A hidden iframe, an extracted CDN URL, or a proxy around such a URL would not be an acceptable workaround.

No supported YouTube Music browser playback SDK was identified that gives this web app an audio-only URL/player for arbitrary catalog tracks. Therefore this iteration leaves YouTube results `metadata-only`; it does not mark them playable or add a resolver that could falsely suggest access. The unavailable state is intentional and correct.

Nearest feasible alternatives are distinct integrations, not silent mappings of YouTube metadata:

- **Official YouTube playback:** open the item in YouTube or use its visible official embedded player. The user must keep the official player visible; background/hidden audio playback is not available under the reviewed API policy.
- **Apple MusicKit JS:** an official web catalog and playback SDK can play catalog items after the user authorizes an Apple Music account and has the required active membership. This would be a new provider/playback adapter, not YouTube audio; it requires a developer token and a user-granted Music User Token.
- **Jamendo API:** the official tracks endpoint returns separate stream URLs and license metadata for Jamendo's catalog. It requires an app client ID and compliance with Jamendo's plan/usage terms. This could be an explicit independent, CC/licensed catalog provider; it does not grant rights to a YouTube video or guarantee an exact YouTube-song match. No Jamendo credential is configured in this repository, so it is not enabled here.

Sources: [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies-guide), [YouTube required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [MusicKit](https://developer.apple.com/musickit/), [Jamendo tracks API](https://developer.jamendo.com/v3.0/tracks), [Jamendo stream URL field and license metadata](https://developer.jamendo.com/v3.0/tracks#).

## Integration decision

| Option | Strength | Limitation | Auralis decision |
|---|---|---|---|
| YouTube Data API v3 | Documented video, channel and playlist discovery; thumbnails, pagination | Requires API key/quota; does not expose a canonical YouTube Music album/artist catalog | Server-side provider for live discovery |
| Official IFrame Player API | Documented play/pause, seek, volume, player events | Video must remain visible; ads, restrictions and browser autoplay rules remain; no audio-only playback | Not used for ordinary Auralis playback |
| ytmusicapi | Rich album, artist, related and music-specific metadata | Unofficial responses and authentication; metadata availability does not authorize extraction | Investigated, not a runtime dependency |
| Innertube-compatible clients | Rich service-specific music navigation | Internal interfaces can change; extraction/access-control paths conflict with requested boundary | Investigated, not implemented |
| Electron wrapper | Existing web-app experience plus desktop integration | Not a reusable server API; different security model | Architectural inspiration only |
| Curated Kevin MacLeod CC BY catalog | No external API credentials; direct HTTPS MP3 sources | Six-track editorial selection, requires internet, not a licensed mainstream catalog | Current authorized audio provider |

YouTube Data API v3 is used only for metadata discovery. It does not expose direct audio URLs. **A channel is not necessarily an artist, and a playlist is not necessarily an album.** Do not fabricate discographies, genres, albums, trending statistics, or proprietary recommendations from these results. YouTube results are tagged `metadata-only` and cannot enter the active audio queue. The credential-free Kevin MacLeod CC BY catalog supplies direct HTTPS MP3 URLs and is playable without video.

## Playback and metadata contract guidance

The backend returns normalized metadata and opaque provider IDs. A track's `Playback` record separates direct `audio` URLs from `youtube` metadata and carries media type, availability and optional expiry. The browser audio runtime consumes only HTTPS sources marked playable (with compatibility for older direct-audio records); an official-player-only state is representable but is not silently converted to audio. Library records store metadata snapshots so saved tracks remain understandable if an upstream resource disappears. Queue order belongs to Auralis; playback authorization belongs to the provider.

The frontend owns one module-scoped HTMLAudioElement for the application lifetime. The engine component attaches event, history and Media Session listeners once; route and Now Playing visibility do not own or recreate the media element. Zustand remains the synchronized queue/control state, and persistence restores a safe, paused queue that requires a fresh user play gesture. Browser autoplay blocks remain possible; play commands are issued synchronously from user initiated store actions and failures are reported in player state. Media Session metadata and play/pause/seek/previous/next actions are used where supported. Browser or operating-system suspension can still interrupt background playback.

Use server-side credentials, bounded request timeouts, metadata caching, pagination and rate limits. Cache metadata separately from playback authorization. Keep recommendations explainable: e.g. rank available items by saved artists and actual listening events. No upstream proprietary recommendation API is claimed.

Sources: [Data API search](https://developers.google.com/youtube/v3/docs/search/list), [playlist listing](https://developers.google.com/youtube/v3/docs/playlists/list).

## Verification limits

This review read repository landing pages, full recursive file trees for five repositories, and selected implementation files. It did not run reference applications, audit their complete dependencies, prove regional playback availability, or exercise a credentialed YouTube account. Source availability and open-source licensing do not establish media rights. Runtime feature verification belongs in the project's verification report.
