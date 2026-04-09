"use client";

import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";

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
          <WinnerConfetti active />
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`mx-auto mt-10 flex max-w-lg items-end justify-center gap-2 sm:gap-4 ${
              sorted.length === 1 ? "max-w-xs" : ""
            }`}
          >
            {sorted.length >= 2 && (
              <PodiumBlockAnimated
                place={2}
                player={second}
                className="w-[28%] sm:w-[30%]"
                barClass="bg-gradient-to-t from-zinc-600 to-zinc-400 min-h-[7rem] sm:min-h-[9rem]"
                label="2"
                reduceMotion={!!reduceMotion}
                delay={0.08}
              />
            )}
            <PodiumBlockAnimated
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
              delay={0.16}
            />
            {sorted.length >= 3 && (
              <PodiumBlockAnimated
                place={3}
                player={third}
                className="w-[28%] sm:w-[30%]"
                barClass="bg-gradient-to-t from-amber-950 to-amber-800 min-h-[5.5rem] sm:min-h-[7rem]"
                label="3"
                reduceMotion={!!reduceMotion}
                delay={0.12}
              />
            )}
          </motion.div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.22 }}
            className="mx-auto mt-4 max-w-md rounded-2xl border border-gray-700/50 bg-[#1a2236] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:mt-6"
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
          href="/host"
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
        <span className="text-3xl font-black text-black/25 sm:text-4xl">
          {label}
        </span>
      </div>
    </div>
  );
}

function PodiumBlockAnimated({
  place,
  player,
  className,
  barClass,
  label,
  delay,
  reduceMotion,
}: {
  place: 1 | 2 | 3;
  player: Player | undefined;
  className: string;
  barClass: string;
  label: string;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={
        reduceMotion ? undefined : { opacity: 0, y: 18, scale: 0.96 }
      }
      animate={
        reduceMotion
          ? undefined
          : place === 1
            ? {
                opacity: 1,
                y: 0,
                scale: [0.96, 1.04, 1],
              }
            : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              opacity: { duration: 0.25, ease: "easeOut", delay },
              y: { type: "spring", stiffness: 320, damping: 26, delay },
              scale:
                place === 1
                  ? { type: "tween", duration: 0.45, ease: "easeOut", delay }
                  : { type: "spring", stiffness: 320, damping: 26, delay },
            }
      }
      className={className}
    >
      <PodiumBlock
        place={place}
        player={player}
        className="w-full"
        barClass={barClass}
        label={label}
      />
    </motion.div>
  );
}
