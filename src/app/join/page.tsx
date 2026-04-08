"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-safe pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Intră în joc
          </h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Introdu codul de la Admin și cum vrei să te vadă ceilalți.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--foreground)]/15 bg-[var(--background)] p-5 shadow-sm sm:p-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              PIN sesiune
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="ex. 004812"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[var(--foreground)]/20 bg-[var(--background)] px-4 text-lg tracking-widest text-[var(--foreground)] shadow-inner outline-none ring-offset-2 placeholder:text-[var(--foreground)]/40 focus:border-[var(--foreground)]/50 focus:ring-2 focus:ring-[var(--foreground)]/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Poreclă
            </span>
            <input
              type="text"
              autoComplete="nickname"
              maxLength={32}
              placeholder="cum te numești"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[var(--foreground)]/20 bg-[var(--background)] px-4 text-base text-[var(--foreground)] shadow-inner outline-none ring-offset-2 placeholder:text-[var(--foreground)]/40 focus:border-[var(--foreground)]/50 focus:ring-2 focus:ring-[var(--foreground)]/20"
            />
          </label>

          {error != null && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleJoin}
            disabled={loading || pin.trim() === "" || nickname.trim() === ""}
            className="min-h-12 w-full rounded-xl bg-[var(--foreground)] px-4 text-base font-semibold text-[var(--background)] transition-opacity active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? "Conectare…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
