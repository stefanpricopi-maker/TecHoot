/* eslint-disable @next/next/no-img-element */
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
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-white">
      <motion.header
        initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/90">
          Clasament
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Sesiunea{" "}
          <span className="font-mono tabular-nums tracking-widest text-white">
            {pin}
          </span>
        </h1>
        <p className="mt-2 text-sm text-white/55">
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
            className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-white/5 p-1"
          >
            <ul className="divide-y divide-white/10">
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
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 tabular-nums text-white/45">
                      {i + 4}.
                    </span>
                    <span className="font-medium text-white/95">
                      {p.display_name}
                    </span>
                  </span>
                  <span className="tabular-nums font-semibold text-amber-200/90">
                    {p.score}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </>
      )}

      <nav className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="rounded-xl border border-white/20 px-6 py-3 text-center text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          Acasă
        </Link>
        <Link
          href="/host"
          className="rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
        >
          Admin nou
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
  const medal =
    place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-2 min-h-[4.5rem] w-full text-center">
        {player ? (
          <>
            <p className="text-2xl sm:text-3xl" aria-hidden>
              {medal}
            </p>
            <p className="mt-1 truncate px-0.5 text-xs font-bold text-white sm:text-sm">
              {player.display_name}
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-amber-300 sm:text-xl">
              {player.score}
            </p>
          </>
        ) : (
          <p className="pt-6 text-xs text-white/35">—</p>
        )}
      </div>
      <div
        className={`flex w-full flex-col items-center justify-end rounded-t-xl px-2 pb-3 pt-6 ${barClass}`}
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
