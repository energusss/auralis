import type { Track } from "../types/music";

let element: HTMLAudioElement | null = null;
let sourceKey = "";
let attempt = 0;
let pendingKey = "";
let expectedPauses = 0;
let reportFailure: ((error: unknown) => void) | null = null;

export function getAudioElement(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "metadata";
  }
  return element;
}

export function onAudioFailure(handler: (error: unknown) => void) {
  reportFailure = handler;
  return () => {
    if (reportFailure === handler) reportFailure = null;
  };
}

function guardedPlay(audio: HTMLAudioElement, key = sourceKey) {
  if (audio.paused === false || pendingKey === key) return;
  const command = ++attempt;
  pendingKey = key;
  try {
    void audio.play().then(
      () => {
        if (pendingKey === key) pendingKey = "";
      },
      (error: unknown) => {
        if (pendingKey === key) pendingKey = "";
        if (command === attempt) reportFailure?.(error);
      },
    );
  } catch (error) {
    if (pendingKey === key) pendingKey = "";
    reportFailure?.(error);
  }
}

export function selectAudioTrack(
  track: Track,
  loadId: number,
  volume: number,
  muted: boolean,
  shouldPlay: boolean,
) {
  if (!element || track.playback.kind !== "audio" || !track.playback.url)
    return;
  const audio = element;
  audio.volume = muted ? 0 : volume;
  audio.muted = false;
  const key = `${track.id}:${loadId}:${track.playback.url}`;
  if (sourceKey !== key) {
    sourceKey = key;
    if (audio.src !== track.playback.url) {
      if (!audio.paused) expectedPauses++;
      audio.src = track.playback.url;
    } else audio.currentTime = 0;
    audio.load();
  }
  if (shouldPlay) guardedPlay(audio, key);
  else pauseAudio();
}

export function resumeAudio() {
  if (!element) return;
  guardedPlay(element);
}

export function pauseAudio() {
  attempt++;
  pendingKey = "";
  if (element && !element.paused) expectedPauses++;
  element?.pause();
}

export function stopAudio() {
  attempt++;
  pendingKey = "";
  sourceKey = "";
  if (!element) return;
  if (!element.paused) expectedPauses++;
  element.pause();
  element.removeAttribute("src");
  element.load();
}

export function consumeExpectedPause() {
  if (expectedPauses < 1) return false;
  expectedPauses--;
  return true;
}

export function seekAudio(position: number) {
  if (element && Number.isFinite(position)) element.currentTime = position;
}

export function setAudioVolume(volume: number, muted: boolean) {
  if (element) {
    element.muted = false;
    element.volume = muted ? 0 : Math.max(0, Math.min(1, volume));
  }
}

export function resetAudioRuntimeForTests() {
  element?.pause();
  element = null;
  sourceKey = "";
  pendingKey = "";
  expectedPauses = 0;
  reportFailure = null;
}
