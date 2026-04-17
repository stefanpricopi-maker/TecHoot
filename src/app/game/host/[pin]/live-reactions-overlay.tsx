"use client";

import { memo } from "react";
import type { CSSProperties } from "react";

export type LiveReactionBurst = {
  id: string;
  emoji: string;
  leftPct: number;
  driftPx: number;
  sizePx: number;
};

export const LiveReactionsOverlay = memo(function LiveReactionsOverlay({
  bursts,
}: {
  bursts: LiveReactionBurst[];
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
    >
      {bursts.map((b) => (
        <span
          key={b.id}
          className="kahoot-reaction-float absolute top-[max(10px,env(safe-area-inset-top))] select-none drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)]"
          style={
            {
              left: `${b.leftPct}%`,
              fontSize: `${b.sizePx}px`,
              ["--rx"]: `${b.driftPx}px`,
            } as CSSProperties & { ["--rx"]?: string }
          }
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
});

