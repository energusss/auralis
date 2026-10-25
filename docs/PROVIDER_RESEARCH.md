# Music-provider investigation

Research performed 25 October 2026. This is a targeted source and architecture review, not a full audit or a claim that the reference applications were built or run. No source code from these projects was copied into Auralis. Repository HEADs can change; the inspected tree identifiers below record this review.

## Reference projects

### 1. th-ch/youtube-music → Pear Desktop

The requested URL now redirects to [pear-devs/pear-desktop](https://github.com/pear-devs/pear-desktop). Inspected tree: `7c55260773c7d8477d6b3339f36a9a3eff9ae112`.

This is an Electron desktop architecture, rather than an independent licensed music API. `src/index.ts` constructs a BrowserWindow, loads the music web application, manages configuration and IPC, and initializes extensions. `src/preload.ts` bridges the renderer and native environment. This architecture benefits from the existing web application's discovery and player, with desktop extensions layered around it. It is not directly portable into an ASP.NET-hosted web application: browser origin isolation and web security differ from a controlled Electron shell.

Useful lesson: isolate playback lifecycle, settings, and optional enhancements. Auralis does not adopt ad-blocking, downloading, browser impersonation, or injected access-control workarounds.

Sources: [entry point](https://github.com/pear-devs/pear-desktop/blob/master/src/index.ts), [preload](https://github.com/pear-devs/pear-desktop/blob/master/src/preload.ts), [repository](https://github.com/th-ch/youtube-music).

### 2. SimpMusic

Inspected SimpMusic tree `068d74435f0cf0e8552af3da07879eafd328fea7` on `dev` (GPL-3.0), plus its `core` submodule at `2894e549763b8a68225b4456d3290f3227bdbb01`. The Android `MediaServiceHandlerImpl` owns playback state and queue operations separately from Compose screens. The common media handler exposes state flows for now-playing, queue, position and controls; `QueueEntity` persists the ordered track list. Its stream repository caches format data and refreshes expired entries through `youTube.player(videoId)`. The fullscreen screen is artwork-first and observes shared player state. SimpMusic's player lifecycle, persistent queue and separation from screen UI are useful patterns for Auralis.

The inspected stream resolver uses unofficial YouTube interfaces. Auralis does **not** port that resolver, cached extracted URLs, or its refresh path. No Kotlin source was copied; GPL-3.0 applies to SimpMusic and code reuse would require a separate license review.

Useful lesson: UI state should not own the provider or native player, and lyrics matches need explicit confidence. Auralis keeps global playback alive across routes. The core submodule implementation was not recursively audited, and SimpMusic was not compiled.

Sources: [README](https://github.com/maxrave-dev/SimpMusic/blob/dev/README.md), [media handler](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/domain/src/commonMain/kotlin/com/maxrave/domain/mediaservice/handler/MediaPlayerHandler.kt), [Android service implementation](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/data/src/androidMain/kotlin/com/maxrave/data/mediaservice/MediaServiceHandlerImpl.kt), [stream repository](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/data/src/commonMain/kotlin/com/maxrave/data/repository/StreamRepositoryImpl.kt), [persisted queue entity](https://github.com/maxrave-dev/core/blob/2894e549763b8a68225b4456d3290f3227bdbb01/domain/src/commonMain/kotlin/com/maxrave/domain/data/entities/QueueEntity.kt), [fullscreen player](https://github.com/maxrave-dev/SimpMusic/blob/dev/composeApp/src/commonMain/kotlin/com/maxrave/simpmusic/ui/screen/player/NowPlayingScreen.kt).

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
