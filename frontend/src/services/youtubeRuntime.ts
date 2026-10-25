type YTStateEvent = { data: number };
type YTErrorEvent = { data: number };
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo?(): void;
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(percent: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getIframe?(): HTMLIFrameElement;
  destroy(): void;
}

export interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId?: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: YTStateEvent) => void;
        onError: (event: YTErrorEvent) => void;
        onAutoplayBlocked: () => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YouTubeRuntimeEvents {
  onStateChange: (state: number) => void;
  onError: (code: number) => void;
  onAutoplayBlocked: () => void;
  onReady: () => void;
}

interface PendingTrack {
  videoId: string;
  autoplay: boolean;
  volume: number;
  muted: boolean;
  key: string;
}

let apiPromise: Promise<YouTubeApi> | null = null;
let player: YouTubePlayer | null = null;
let playerHost: HTMLElement | null = null;
let ready = false;
let events: YouTubeRuntimeEvents | null = null;
let pending: PendingTrack | null = null;
let active = false;
let appliedKey = "";

function loadApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error("YouTube IFrame API timed out"));
    }, 20000);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API did not initialize"));
    };
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script.onerror = () => {
      window.clearTimeout(timeout);
      apiPromise = null;
      script?.remove();
      reject(new Error("Unable to load the YouTube IFrame API"));
    };
  });
  return apiPromise;
}

function applyPendingTrack() {
  if (!player || !ready || !pending) return;
  const request = pending;
  pending = null;
  appliedKey = request.key;
  player.setVolume(request.muted ? 0 : Math.round(request.volume * 100));
  if (request.muted) player.mute();
  else player.unMute();
  if (request.autoplay) player.loadVideoById(request.videoId);
  else player.cueVideoById(request.videoId);
}

/** Creates exactly one official player for the lifetime of the application shell. */
export function initializeYouTubePlayer(
  host: HTMLElement,
  nextEvents: YouTubeRuntimeEvents,
) {
  events = nextEvents;
  if (player) return;
  if (playerHost && playerHost !== host) return;
  playerHost = host;
  void loadApi()
    .then((api) => {
      if (player || !playerHost) return;
      const mount = document.createElement("div");
      playerHost.replaceChildren(mount);
      player = new api.Player(mount, {
        width: 360,
        height: 270,
        videoId: pending?.videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ready = true;
            const iframe = player?.getIframe?.();
            if (iframe) iframe.title = "YouTube video player";
            events?.onReady();
            applyPendingTrack();
          },
          onStateChange: ({ data }) => events?.onStateChange(data),
          onError: ({ data }) => events?.onError(data),
          onAutoplayBlocked: () => events?.onAutoplayBlocked(),
        },
      });
    })
    .catch(() => events?.onError(-1));
}

export function selectYouTubeTrack(
  videoId: string,
  key: string,
  autoplay: boolean,
  volume: number,
  muted: boolean,
) {
  active = true;
  pending = { videoId, key, autoplay, volume, muted };
  if (!player || !ready) return;
  if (appliedKey === key) {
    pending = null;
    if (autoplay && typeof player.playVideo === "function") player.playVideo();
    else if (!autoplay && typeof player.pauseVideo === "function") player.pauseVideo();
    return;
  }
  applyPendingTrack();
}

export function playYouTube() {
  if (player && ready && active && typeof player.playVideo === "function") player.playVideo();
  else if (pending) {
    pending.autoplay = true;
    applyPendingTrack();
  }
}

export function pauseYouTube() {
  if (pending) pending.autoplay = false;
  if (ready && player && typeof player.pauseVideo === "function") player.pauseVideo();
}

/** Pauses before handing the sole audible slot to the HTMLAudioElement adapter. */
export function deactivateYouTube() {
  const wasActive = active || pending !== null;
  active = false;
  pending = null;
  if (!wasActive || !ready) return;
  if (player && typeof player.stopVideo === "function") player.stopVideo();
  else if (player && typeof player.pauseVideo === "function") player.pauseVideo();
}

export function seekYouTube(seconds: number) {
  if (active && Number.isFinite(seconds)) player?.seekTo(seconds, true);
}

export function setYouTubeVolume(volume: number, muted: boolean) {
  if (!player) return;
  player.setVolume(
    muted ? 0 : Math.round(Math.max(0, Math.min(1, volume)) * 100),
  );
  if (muted) player.mute();
  else player.unMute();
}

export function youtubePosition() {
  try {
    return active ? player?.getCurrentTime() || 0 : 0;
  } catch {
    return 0;
  }
}

export function youtubeDuration() {
  try {
    return active ? player?.getDuration() || 0 : 0;
  } catch {
    return 0;
  }
}

export function youtubeIsAudible() {
  try {
    return active && player?.getPlayerState() === 1;
  } catch {
    return false;
  }
}

export function youtubeIsActive() {
  return active;
}

export function resetYouTubeRuntimeForTests() {
  player?.destroy();
  player = null;
  playerHost = null;
  ready = false;
  events = null;
  pending = null;
  active = false;
  appliedKey = "";
  apiPromise = null;
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
}
