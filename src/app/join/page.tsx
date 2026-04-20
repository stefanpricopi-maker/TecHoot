"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { joinSession, resolveResumeRoute } from "@/app/actions/game-actions";
import {
  LS_AVATAR_KEY,
  LS_NICKNAME_KEY,
  LS_PIN_KEY,
  LS_PLAYER_ID_KEY,
} from "@/lib/player-storage";
import { AVATAR_OPTIONS, DEFAULT_AVATAR_KEY, isAvatarKey } from "@/lib/avatars";

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>(DEFAULT_AVATAR_KEY);
  const [resume, setResume] = useState<{
    pin: string;
    playerId: string;
    nickname: string;
  } | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeErr, setResumeErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const urlPin = url.searchParams.get("pin");
    if (urlPin && pin.trim() === "") {
      setPin(urlPin);
    }
  }, [pin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPin = window.localStorage.getItem(LS_PIN_KEY) ?? "";
    const storedPlayerId = window.localStorage.getItem(LS_PLAYER_ID_KEY) ?? "";
    const storedNickname = window.localStorage.getItem(LS_NICKNAME_KEY) ?? "";
    const storedAvatar = window.localStorage.getItem(LS_AVATAR_KEY) ?? "";
    if (storedAvatar && isAvatarKey(storedAvatar)) {
      setAvatarKey(storedAvatar);
    }
    if (storedPin && storedPlayerId && storedNickname) {
      setResume({
        pin: storedPin,
        playerId: storedPlayerId,
        nickname: storedNickname,
      });
    } else {
      setResume(null);
    }
  }, []);

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  const clearStoredPlayer = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_PLAYER_ID_KEY);
    window.localStorage.removeItem(LS_NICKNAME_KEY);
    window.localStorage.removeItem(LS_PIN_KEY);
  }, []);

  const handleResume = useCallback(async () => {
    if (!resume) return;
    setResumeErr(null);
    setResumeBusy(true);
    try {
      const res = await resolveResumeRoute({
        pin: resume.pin,
        playerId: resume.playerId,
        nickname: resume.nickname,
      });
      if (!res.ok) {
        setResumeErr(res.error);
        clearStoredPlayer();
        setResume(null);
        return;
      }
      router.push(res.route);
    } finally {
      setResumeBusy(false);
    }
  }, [resume, router, clearStoredPlayer]);

  const handleJoin = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await joinSession(pin, nickname, avatarKey);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PLAYER_ID_KEY, result.playerId);
        window.localStorage.setItem(LS_NICKNAME_KEY, result.nickname);
        window.localStorage.setItem(LS_PIN_KEY, result.pin);
        window.localStorage.setItem(
          LS_AVATAR_KEY,
          isAvatarKey(avatarKey) ? avatarKey : DEFAULT_AVATAR_KEY,
        );
      }
      router.push(`/lobby/${encodeURIComponent(result.pin)}`);
    } finally {
      setLoading(false);
    }
  }, [pin, nickname, avatarKey, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-gray-100">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Înapoi
        </button>
      </div>
      <div className="w-full max-w-md space-y-8">
        {resume && (
          <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <p className="text-sm font-semibold text-gray-100">
              Ești deja în jocul{" "}
              <span className="font-mono tabular-nums tracking-widest text-[#f59e0b]">
                {resume.pin}
              </span>
              .
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Reiei ca <span className="font-semibold text-gray-100">{resume.nickname}</span>?
            </p>
            {resumeErr && (
              <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {resumeErr}
              </p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleResume}
                disabled={resumeBusy}
                className="min-h-12 rounded-2xl bg-[#f59e0b] px-4 text-base font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              >
                {resumeBusy ? "Reiau…" : "Reia"}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearStoredPlayer();
                  setResume(null);
                  setResumeErr(null);
                }}
                className="min-h-12 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-base font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Joc nou
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#f59e0b]">
            Intră în joc
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Introdu PIN sesiune și numele tău.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-100">
              PIN sesiune
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="ex. 004812"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-lg tracking-widest text-gray-100 shadow-inner outline-none placeholder:text-gray-500 focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-100">
              Numele tău
            </span>
            <input
              type="text"
              autoComplete="nickname"
              maxLength={32}
              placeholder="ex. Marc"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-base text-gray-100 shadow-inner outline-none placeholder:text-gray-500 focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
            />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-100">Avatar</p>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.filter((a) => a.gender === "f").map((a) => {
                  const selected = avatarKey === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setAvatarKey(a.key)}
                      className={`min-h-12 rounded-2xl border px-0 text-sm font-extrabold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                        selected
                          ? "border-[#f59e0b]/60 bg-[#0a0f1e]"
                          : "border-gray-700/50 bg-[#0a0f1e]/60"
                      }`}
                      aria-label={`Avatar: ${a.label}`}
                      title={a.label}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.srcWebp}
                        alt=""
                        className="mx-auto h-9 w-9 rounded-xl object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const n = Number(img.dataset.fallbackStep ?? "0");
                          if (n >= 2) return;
                          const next = n === 0 ? a.srcHeif : a.srcPng;
                          img.dataset.fallbackStep = String(n + 1);
                          img.src = next;
                        }}
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.filter((a) => a.gender === "m").map((a) => {
                  const selected = avatarKey === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setAvatarKey(a.key)}
                      className={`min-h-12 rounded-2xl border px-0 text-sm font-extrabold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                        selected
                          ? "border-[#f59e0b]/60 bg-[#0a0f1e]"
                          : "border-gray-700/50 bg-[#0a0f1e]/60"
                      }`}
                      aria-label={`Avatar: ${a.label}`}
                      title={a.label}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.srcWebp}
                        alt=""
                        className="mx-auto h-9 w-9 rounded-xl object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const n = Number(img.dataset.fallbackStep ?? "0");
                          if (n >= 2) return;
                          const next = n === 0 ? a.srcHeif : a.srcPng;
                          img.dataset.fallbackStep = String(n + 1);
                          img.src = next;
                        }}
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                Sus: feminine · jos: masculine
              </p>
            </div>
          </div>

          {error != null && (
            <p
              role="alert"
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleJoin}
            disabled={loading || pin.trim() === "" || nickname.trim() === ""}
            className="min-h-12 w-full rounded-2xl bg-[#f59e0b] px-4 text-base font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            {loading ? "Conectare…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
