"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { joinSession } from "@/app/actions/game-actions";
import {
  LS_NICKNAME_KEY,
  LS_PIN_KEY,
  LS_PLAYER_ID_KEY,
} from "@/lib/player-storage";

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
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

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  const handleJoin = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await joinSession(pin, nickname);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PLAYER_ID_KEY, result.playerId);
        window.localStorage.setItem(LS_NICKNAME_KEY, result.nickname);
        window.localStorage.setItem(LS_PIN_KEY, result.pin);
      }
      router.push(`/lobby/${encodeURIComponent(result.pin)}`);
    } finally {
      setLoading(false);
    }
  }, [pin, nickname, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-gray-100">
      <button
        type="button"
        onClick={handleBack}
        className="absolute left-6 top-6 min-h-11 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Back
      </button>
      <div className="w-full max-w-md space-y-8">
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
              placeholder="Cum te numești"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-base text-gray-100 shadow-inner outline-none placeholder:text-gray-500 focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
            />
          </label>

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
