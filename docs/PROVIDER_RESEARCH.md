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

Python metadata client which emulates YouTube Music web requests. Inspected `ytmusicapi/mixins/browsing.py`. Its browsing mixin uses `browse` and continuation responses to assemble typed-in-practice dictionaries for home shelves, artists, albums, songs, rel