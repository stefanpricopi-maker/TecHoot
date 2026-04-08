"use client";

export type SfxKey = "start" | "correct" | "wrong" | "finish";

type SfxOptions = {
  volume?: number;
};

const DEFAULT_VOLUME = 0.5;

// Placeholder paths. Drop files into `public/sfx/` (mp3/ogg/wav) to enable audio.
const SFX_URLS: Record<SfxKey, string> = {
  start: "/sfx/start.mp3",
  correct: "/sfx/correct.mp3",
  wrong: "/sfx/wrong.mp3",
  finish: "/sfx/finish.mp3",
};

function canUseAudio(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function preloadSfx(): void {
  if (!canUseAudio()) return;
  for (const key of Object.keys(SFX_URLS) as SfxKey[]) {
    const a = new Audio(SFX_URLS[key]);
    a.preload = "auto";
  }
}

export function playSfx(key: SfxKey, opts?: SfxOptions): void {
  if (!canUseAudio()) return;
  const url = SFX_URLS[key];
  // New Audio() avoids overlap issues; best-effort if user gesture not available.
  const a = new Audio(url);
  a.volume = Math.max(0, Math.min(1, opts?.volume ?? DEFAULT_VOLUME));
  void a.play().catch(() => {
    // Autoplay restrictions: ignore silently. Caller can trigger from a click.
  });
}

