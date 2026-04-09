"use client";

import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Player } from "@/types/game";

import { WinnerConfetti } from "./winner-confetti";

type ResultsPodiumProps = {
  pin: string;
  players: Player[];
};

function byScoreThenJoined(a: Player, b: Player): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
}

export function ResultsPodium({ pin, players }: ResultsPodiumProps) {
  const reduceMotion = useReducedMotion();
  const sorted = [...players].sort(byScoreThenJoined);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const rest = sorted.slice(3);

  const podiumOrder = useMemo(() => {
    const order: Array<{
      place: 1 | 2 | 3;
      player: Player | undefined;
      label: string;
      className: string;
      barClass: string;
    }> = [];
    if (sorted.length >= 3) {
      order.push({
        place: 3,
        player: third,
        label: "3",
        className: "w-[28%] sm:w-[30%]",
        barClass:
          "bg-gradient-to-t from-amber-950 to-amber-800 min-h-[5.5rem] sm:min-h-[7rem]",
      });
    }
    if (sorted.length >= 2) {
      order.push({
        place: 2,
        player: second,
        label: "2",
        className: "w-[28%] sm:w-[30%]",
        barClass:
          "bg-gradient-to-t from-zinc-600 to-zinc-400 min-h-[7rem] sm:min-h-[9rem]",
      });
    }
    if (sorted.length >= 1) {
      order.push({
        place: 1,
        player: first,
        label: "1",
        className:
          sorted.length === 1 ? "w-full max-w-[12rem]" : "w-[36%] sm:w-[34%]",
        barClass:
          "bg-gradient-to-t from-amber-700 to-amber-400 min-h-[10rem] sm:min-h-[12rem] shadow-lg shadow-amber-900/40",
      });
    }
    return order;
  }, [first, second, third, sorted.length]);

  const [startedPlaces, setStartedPlaces] = useState<Record<number, boolean>>({});
  const [nameShownPlaces, setNameShownPlaces] = useState<Record<number, boolean>>(
    {},
  );
  const [confettiActive, setConfettiActive] = useState(false);
  const sequenceKey = useMemo(
    () => podiumOrder.map((p) => p.player?.id ?? "none").join("|"),
    [podiumOrder],
  );
  const lastSequenceKeyRef = useRef<string>("");

  useEffect(() => {
    if (reduceMotion || podiumOrder.length === 0) {
      setStartedPlaces({ 1: true, 2: true, 3: true });
      setNameShownPlaces({ 1: true, 2: true, 3: true });
      setConfettiActive(sorted.length > 0);
      return;
    }

    // Avoid restarting the whole sequence on incidental re-renders.
    if (lastSequenceKeyRef.current === sequenceKey) {
      return;
    }
    lastSequenceKeyRef.current = sequenceKey;

    let cancelled = false;
    setStartedPlaces({});
    setNameShownPlaces({});
    setConfettiActive(false);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), ms);
      });

    void (async () => {
      // Sequence:
      // place 3: bar up (3s) -> name
      // place 2: bar up (3s) -> name
      // place 1: bar up (3s) with name + confetti starting together
      // Start only after the lower panel is fully visible.
      await wait(650);
      for (let i = 0; i < podiumOrder.length; i++) {
        const item = podiumOrder[i]!;
        if (cancelled) return;

        setStartedPlaces((s) => ({ ...s, [item.place]: true }));
        await wait(3000);
        if (cancelled) return;

        setNameShownPlaces((s) => ({ ...s, [item.place]: true }));
        if (item.place === 1) {
          setConfettiActive(true);
        }
        await wait(220);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [podiumOrder, reduceMotion, sorted.length]);

  return (
    <div className="min-h-dvh bg-[#0a0f1e] px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100">
      <motion.header
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          Clasament
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#f59e0b] sm:text-3xl md:text-4xl">
          Sesiunea{" "}
          <span className="font-mono tabular-nums tracking-widest text-gray-100">
            {pin}
          </span>
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          {sorted.length === 0
            ? "Niciun jucător în această sesiune."
            : `${sorted.length} participanți`}
        </p>
      </motion.header>

      {sorted.length > 0 && (
        <>
          <WinnerConfetti active={confettiActive} />
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`relative z-0 mx-auto mt-10 flex max-w-lg items-end justify-center gap-2 sm:gap-4 ${
              sorted.length === 1 ? "max-w-xs" : ""
            }`}
          >
            {sorted.length >= 2 && (
              <PodiumBlockSequenced
                place={2}
                player={second}
                className="w-[28%] sm:w-[30%]"
                barClass="bg-gradient-to-t from-zinc-600 to-zinc-400 min-h-[7rem] sm:min-h-[9rem]"
                label="2"
                reduceMotion={!!reduceMotion}
                barStarted={!!startedPlaces[2]}
                nameVisible={!!nameShownPlaces[2]}
              />
            )}
            <PodiumBlockSequenced
              place={1}
              player={first}
              className={
                sorted.length === 1
                  ? "w-full max-w-[12rem]"
                  : "w-[36%] sm:w-[34%]"
              }
              barClass="bg-gradient-to-t from-amber-700 to-amber-400 min-h-[10rem] sm:min-h-[12rem] shadow-lg shadow-amber-900/40"
              label="1"
              reduceMotion={!!reduceMotion}
              barStarted={!!startedPlaces[1]}
              nameVisible={!!nameShownPlaces[1]}
            />
            {sorted.length >= 3 && (
              <PodiumBlockSequenced
                place={3}
                player={third}
                className="w-[28%] sm:w-[30%]"
                barClass="bg-gradient-to-t from-amber-950 to-amber-800 min-h-[5.5rem] sm:min-h-[7rem]"
                label="3"
                reduceMotion={!!reduceMotion}
                barStarted={!!startedPlaces[3]}
                nameVisible={!!nameShownPlaces[3]}
              />
            )}
          </motion.div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.22 }}
            className="relative z-20 mx-auto -mt-[24px] min-h-[106px] max-w-lg overflow-hidden rounded-2xl bg-[#1a2236] p-3 sm:-mt-[32px] sm:min-h-[114px]"
          >
            <ul className="divide-y divide-gray-700/50">
              {rest.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                  animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                    delay: 0.24 + i * 0.03,
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-4 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 tabular-nums text-gray-500">
                      {i + 4}.
                    </span>
                    <span className="font-semibold text-gray-100">
                      {p.display_name}
                    </span>
                  </span>
                  <span className="tabular-nums font-extrabold text-[#f59e0b]">
                    {p.score}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </>
      )}

      <nav className="mx-auto mt-10 flex max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-8 py-3 text-center text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Acasă
        </Link>
        <Link
          href="/join"
          className="rounded-2xl bg-[#f59e0b] px-8 py-3 text-center text-sm font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Joc nou
        </Link>
      </nav>
    </div>
  );
}

function PodiumBlock({
  place,
  player,
  className,
  barClass,
  label,
}: {
  place: 1 | 2 | 3;
  player: Player | undefined;
  className: string;
  barClass: string;
  label: string;
}) {
  const medal = place === 1 ? "👑" : place === 2 ? "🥈" : "🥉";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-2 min-h-[4.5rem] w-full text-center">
        {player ? (
          <>
            <p className="text-2xl sm:text-3xl" aria-hidden>
              {medal}
            </p>
            <p className="mt-1 truncate px-0.5 text-xs font-bold text-gray-100 sm:text-sm">
              {player.display_name}
            </p>
            <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-[#f59e0b] sm:text-xl">
              {player.score}
            </p>
          </>
        ) : (
          <p className="pt-6 text-xs text-gray-600">—</p>
        )}
      </div>
      <div
        className={`flex w-full flex-col items-center justify-end rounded-t-2xl px-2 pb-3 pt-6 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.12)] ${barClass}`}
      >
        <span className="mb-6 text-3xl font-black text-black/25 sm:mb-8 sm:text-4xl">
          {label}
        </span>
      </div>
    </div>
  );
}

function PodiumBlockSequenced({
  place,
  player,
  className,
  barClass,
  label,
  reduceMotion,
  barStarted,
  nameVisible,
}: {
  place: 1 | 2 | 3;
  player: Player | undefined;
  className: string;
  barClass: string;
  label: string;
  reduceMotion: boolean;
  barStarted: boolean;
  nameVisible: boolean;
}) {
  const medal = place === 1 ? "👑" : place === 2 ? "🥈" : "🥉";
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: nameVisible ? 1 : 0 }}
        transition={reduceMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
        className="mb-2 min-h-[4.5rem] w-full text-center"
      >
        {player ? (
          <>
            <p className="text-2xl sm:text-3xl" aria-hidden>
              {medal}
            </p>
            <p className="mt-1 truncate px-0.5 text-xs font-bold text-gray-100 sm:text-sm">
              {player.display_name}
            </p>
            <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-[#f59e0b] sm:text-xl">
              {player.score}
            </p>
          </>
        ) : (
          <p className="pt-6 text-xs text-gray-600">—</p>
        )}
      </motion.div>

      <motion.div
        initial={
          reduceMotion ? undefined : { opacity: 0, y: 80 }
        }
        animate={
          reduceMotion
            ? undefined
            : barStarted
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 80 }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                opacity: { duration: 0.18, ease: "easeOut" },
                y: { type: "tween", duration: barStarted ? 3 : 0, ease: "easeOut" },
              }
        }
        className={`flex w-full flex-col items-center justify-end rounded-t-2xl px-2 pb-3 pt-6 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.12)] ${barClass}`}
      >
        <span className="mb-6 text-3xl font-black text-black/25 sm:mb-8 sm:text-4xl">
          {label}
        </span>
      </motion.div>
    </div>
  );
}
