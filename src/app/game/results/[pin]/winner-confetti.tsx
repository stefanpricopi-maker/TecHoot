"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

type WinnerConfettiProps = {
  /** Rulează o dată când există cel puțin un jucător (câștigător pe podium). */
  active: boolean;
};

export function WinnerConfetti({ active }: WinnerConfettiProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }
    if (hasFired.current) {
      return;
    }

    hasFired.current = true;

    const colors = [
      "#fde047",
      "#fbbf24",
      "#f59e0b",
      "#34d399",
      "#38bdf8",
      "#e879f9",
      "#fb7185",
    ];

    const burst = (originX: number, delay: number) => {
      window.setTimeout(() => {
        void confetti({
          particleCount: 42,
          spread: 58,
          startVelocity: 32,
          ticks: 200,
          origin: { x: originX, y: 0.52 },
          colors,
          gravity: 0.95,
          scalar: 0.85,
          zIndex: 9999,
        });
      }, delay);
    };

    burst(0.2, 120);
    burst(0.5, 280);
    burst(0.8, 440);

    const centerId = window.setTimeout(() => {
      void confetti({
        particleCount: 65,
        spread: 100,
        startVelocity: 28,
        ticks: 240,
        origin: { x: 0.5, y: 0.4 },
        colors,
        gravity: 0.85,
        scalar: 1,
        zIndex: 9999,
      });
    }, 600);

    return () => {
      window.clearTimeout(centerId);
    };
  }, [active]);

  return null;
}
