"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameSession } from "@/types/game";

type Role = "host" | "player";

type UseGameAudioParams = {
  role: Role;
  status: GameSession["status"];
  timeLeft?: number | null;
  roundOutcome?: "correct" | "wrong" | "none" | "loading" | null;
};

type AudioKey =
  | "lobby_loop"
  | "suspense_loop"
  | "suspense_intense_loop"
  | "reveal"
  | "correct"
  | "wrong"
  | "finish";

const AUDIO_URLS: Record<AudioKey, string> = {
  // Orchestral / epic placeholders. Add these files into `public/sfx/`.
  lobby_loop: "/sfx/orchestral-lobby.mp3",
  suspense_loop: "/sfx/orchestral-suspense.mp3",
  suspense_intense_loop: "/sfx/orchestral-suspense-intense.mp3",
  reveal: "/sfx/orchestral-reveal.mp3",
  correct: "/sfx/correct.mp3",
  wrong: "/sfx/wrong.mp3",
  finish: "/sfx/orchestral-finale.mp3",
};

const MUTE_LS_KEY = "kahoot-live:muted";

function canUseAudio(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function safePlay(a: HTMLAudioElement): void {
  void a.play().catch(() => {
    // Autoplay restrictions; must be unlocked by user gesture.
  });
}

function safeStop(a: HTMLAudioElement): void {
  a.pause();
  a.currentTime = 0;
}

export function useGameAudio({
  role,
  status,
  timeLeft,
  roundOutcome,
}: UseGameAudioParams) {
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUTE_LS_KEY) === "1";
  });

  const audios = useRef<Partial<Record<AudioKey, HTMLAudioElement>>>({});
  const prevStatusRef = useRef<GameSession["status"] | null>(null);
  const prevOutcomeRef = useRef<string | null>(null);

  const ensure = useCallback((key: AudioKey) => {
    if (!canUseAudio()) return null;
    if (!audios.current[key]) {
      const a = new Audio(AUDIO_URLS[key]);
      a.preload = "auto";
      audios.current[key] = a;
    }
    return audios.current[key] ?? null;
  }, []);

  const setLooping = useCallback(
    (key: AudioKey, loop: boolean) => {
      const a = ensure(key);
      if (!a) return;
      a.loop = loop;
    },
    [ensure],
  );

  const setVol = useCallback(
    (key: AudioKey, volume: number) => {
      const a = ensure(key);
      if (!a) return;
      a.volume = Math.max(0, Math.min(1, volume));
    },
    [ensure],
  );

  const stopAll = useCallback(() => {
    for (const a of Object.values(audios.current)) {
      if (a) safeStop(a);
    }
  }, []);

  const unlock = useCallback(() => {
    if (!canUseAudio()) return;
    setUnlocked(true);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MUTE_LS_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  const bgmKey = useMemo(() => {
    if (role !== "host") return null;
    if (status === "lobby") return "lobby_loop" as const;
    if (status === "question_active") {
      if (typeof timeLeft === "number" && timeLeft <= 5) {
        return "suspense_intense_loop" as const;
      }
      return "suspense_loop" as const;
    }
    return null;
  }, [role, status, timeLeft]);

  // Preload likely assets.
  useEffect(() => {
    if (!canUseAudio()) return;
    ensure("lobby_loop");
    ensure("suspense_loop");
    ensure("suspense_intense_loop");
    ensure("reveal");
    ensure("correct");
    ensure("wrong");
    ensure("finish");
    setLooping("lobby_loop", true);
    setLooping("suspense_loop", true);
    setLooping("suspense_intense_loop", true);
    setVol("lobby_loop", 0.25);
    setVol("suspense_loop", 0.28);
    setVol("suspense_intense_loop", 0.35);
    setVol("reveal", 0.6);
    setVol("correct", 0.55);
    setVol("wrong", 0.55);
    setVol("finish", 0.55);
  }, [ensure, setLooping, setVol]);

  // Background music controller (host).
  useEffect(() => {
    if (role !== "host") return;
    if (!unlocked || muted) {
      stopAll();
      return;
    }

    // Switch BGM track.
    const lobby = ensure("lobby_loop");
    const suspense = ensure("suspense_loop");
    const intense = ensure("suspense_intense_loop");
    if (!lobby || !suspense || !intense) return;

    const playOneLoop = (target: HTMLAudioElement) => {
      for (const a of [lobby, suspense, intense]) {
        if (a !== target) a.pause();
      }
      safePlay(target);
    };

    if (bgmKey === "lobby_loop") playOneLoop(lobby);
    else if (bgmKey === "suspense_loop") playOneLoop(suspense);
    else if (bgmKey === "suspense_intense_loop") playOneLoop(intense);
    else {
      lobby.pause();
      suspense.pause();
      intense.pause();
    }
  }, [role, unlocked, muted, bgmKey, ensure, stopAll]);

  // Global SFX (host).
  useEffect(() => {
    if (role !== "host") return;
    if (!unlocked || muted) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prev !== status && status === "showing_results") {
      const r = ensure("reveal");
      if (r) {
        r.currentTime = 0;
        safePlay(r);
      }
    }
    if (prev !== status && status === "finished") {
      const f = ensure("finish");
      if (f) {
        f.currentTime = 0;
        safePlay(f);
      }
    }
  }, [role, status, unlocked, muted, ensure]);

  // Player feedback SFX.
  useEffect(() => {
    if (role !== "player") return;
    if (!unlocked || muted) return;
    if (!roundOutcome || roundOutcome === "loading" || roundOutcome === "none") {
      prevOutcomeRef.current = String(roundOutcome ?? "");
      return;
    }
    const prev = prevOutcomeRef.current;
    const cur = String(roundOutcome);
    prevOutcomeRef.current = cur;
    if (prev === cur) return;
    if (roundOutcome === "correct") {
      const c = ensure("correct");
      if (c) {
        c.currentTime = 0;
        safePlay(c);
      }
    } else if (roundOutcome === "wrong") {
      const w = ensure("wrong");
      if (w) {
        w.currentTime = 0;
        safePlay(w);
      }
    }
  }, [role, roundOutcome, unlocked, muted, ensure]);

  return {
    muted,
    unlocked,
    unlock,
    toggleMuted,
  };
}

