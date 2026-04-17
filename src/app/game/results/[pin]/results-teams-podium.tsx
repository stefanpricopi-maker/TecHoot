"use client";

import Link from "next/link";

import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { WinnerConfetti } from "./winner-confetti";

export type TeamLeaderboardRow = {
  teamId: string;
  name: string;
  score: number;
  members: number;
};

function byScoreThenName(a: TeamLeaderboardRow, b: TeamLeaderboardRow): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.name.localeCompare(b.name, "ro");
}

export function ResultsTeamsPodium({
  pin,
  teams,
  ctaHref,
  ctaLabel,
  adminStatsHref,
}: {
  pin: string;
  teams: TeamLeaderboardRow[];
  ctaHref: string;
  ctaLabel: string;
  adminStatsHref: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const sorted = useMemo(() => [...teams].sort(byScoreThenName), [teams]);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  const podiumOrder = useMemo(() => {
    const order: Array<{
      place: 1 | 2 | 3;
      team: TeamLeaderboardRow | undefined;
      label: string;
      className: string;
      barClass: string;
    }> = [];
    if (sorted.length >= 3) {
      order.push({
        place: 3,
        team: third,
        label: "3",
        className: "w-[28%] sm:w-[30%]",
        barClass:
          "bg-gradient-to-t from-amber-950 to-amber-800 min-h-[5.5rem] sm:min-h-[7rem]",
      });
    }
    if (sorted.length >= 2) {
      order.push({
        place: 2,
        team: second,
        label: "2",
        className: "w-[28%] sm:w-[30%]",
        barClass:
          "bg-gradient-to-t from-zinc-600 to-zinc-400 min-h-[7rem] sm:min-h-[9rem]",
      });
    }
    if (sorted.length >= 1) {
      order.push({
        place: 1,
        team: first,
        label: "1",
        className: sorted.length === 1 ? "w-full max-w-[12rem]" : "w-[36%] sm:w-[34%]",
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
    () => podiumOrder.map((p) => p.team?.teamId ?? "none").join("|"),
    [podiumOrder],
  );

  useEffect(() => {
    if (podiumOrder.length === 0) {
      setStartedPlaces({});
      setNameShownPlaces({});
      setConfettiActive(false);
      return;
    }

    let cancelled = false;
    setStartedPlaces({});
    setNameShownPlaces({});
    setConfettiActive(false);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), ms);
      });

    void (async () => {
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
  }, [sequenceKey]);

  return (
    <MotionConfig reducedMotion="never">
      <div className="min-h-dvh bg-[#0a0f1e]/40 px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100 backdrop-blur-sm">
        <motion.header
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-[#f59e0b] sm:text-3xl md:text-4xl">
            Clasament (Echipe)
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-gray-400">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">
              Sesiunea{" "}
              <span className="font-mono tabular-nums tracking-widest text-gray-100">
                {pin}
              </span>
            </p>
            <span className="opacity-60" aria-hidden>
              |
            </span>
            <p className="text-sm">
              {sorted.length === 0 ? "Nicio echipă în această sesiune." : `${sorted.length} echipe`}
            </p>
          </div>
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
                <PodiumTeamBlockSequenced
                  place={2}
                  team={second}
                  className="w-[28%] sm:w-[30%]"
                  barClass="bg-gradient-to-t from-zinc-600 to-zinc-400 min-h-[7rem] sm:min-h-[9rem]"
                  label="2"
                  reduceMotion={false}
                  barStarted={!!startedPlaces[2]}
                  nameVisible={!!nameShownPlaces[2]}
                />
              )}
              <PodiumTeamBlockSequenced
                place={1}
                team={first}
                className={
                  sorted.length === 1 ? "w-full max-w-[12rem]" : "w-[36%] sm:w-[34%]"
                }
                barClass="bg-gradient-to-t from-amber-700 to-amber-400 min-h-[10rem] sm:min-h-[12rem] shadow-lg shadow-amber-900/40"
                label="1"
                reduceMotion={false}
                barStarted={!!startedPlaces[1]}
                nameVisible={!!nameShownPlaces[1]}
              />
              {sorted.length >= 3 && (
                <PodiumTeamBlockSequenced
                  place={3}
                  team={third}
                  className="w-[28%] sm:w-[30%]"
                  barClass="bg-gradient-to-t from-amber-950 to-amber-800 min-h-[5.5rem] sm:min-h-[7rem]"
                  label="3"
                  reduceMotion={false}
                  barStarted={!!startedPlaces[3]}
                  nameVisible={!!nameShownPlaces[3]}
                />
              )}
            </motion.div>

            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.22 }}
              className="relative z-20 mx-auto -mt-[19px] flex min-h-[100px] max-w-lg items-center overflow-hidden border-t-[30px] border-t-[#0a0f1e] bg-[#1a2236] p-3 sm:-mt-[27px] sm:min-h-[116px]"
            >
              <nav className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={ctaHref}
                  className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-8 py-3 text-center text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {ctaLabel}
                </Link>
                {adminStatsHref ? (
                  <Link
                    href={adminStatsHref}
                    className="rounded-2xl bg-[#f59e0b] px-8 py-3 text-center text-sm font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Statistici
                  </Link>
                ) : null}
              </nav>
            </motion.div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}

function PodiumTeamBlockSequenced({
  place,
  team,
  className,
  barClass,
  label,
  reduceMotion,
  barStarted,
  nameVisible,
}: {
  place: 1 | 2 | 3;
  team: TeamLeaderboardRow | undefined;
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
      <div className="mb-2 min-h-[4.5rem] w-full text-center">
        {team ? (
          <>
            <p className="text-2xl sm:text-3xl" aria-hidden>
              {medal}
            </p>
            <p className="mt-1 line-clamp-2 px-1 text-xs font-extrabold leading-snug text-gray-100 sm:px-0 sm:text-base">
              {nameVisible ? team.name : ""}
            </p>
            <p className="mt-1 font-mono text-xs font-bold text-[#f59e0b]">
              {nameVisible ? team.score : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </div>
      <motion.div
        initial={reduceMotion ? undefined : { scaleY: 0, opacity: 0.6 }}
        animate={
          reduceMotion
            ? undefined
            : barStarted
              ? { scaleY: 1, opacity: 1 }
              : { scaleY: 0, opacity: 0.6 }
        }
        transition={{ duration: reduceMotion ? 0 : 3, ease: "easeOut" }}
        className={`relative w-full origin-bottom rounded-2xl ${barClass}`}
      >
        <span className="absolute left-3 top-3 rounded-xl bg-black/20 px-2 py-1 text-xs font-black text-white/90">
          {label}
        </span>
      </motion.div>
    </div>
  );
}

