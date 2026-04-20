"use client";

import { useState } from "react";

import {
  avatarGender,
  avatarLabel,
  avatarShort,
  avatarSrcWebp,
  avatarSrcHeif,
  avatarSrcPng,
} from "@/lib/avatars";

export function PlayerAvatar(props: {
  avatarKey?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const size = props.size ?? "md";
  const dim =
    size === "sm" ? "size-6 text-base" : size === "lg" ? "size-11 text-2xl" : "size-9 text-xl";
  const short = avatarShort(props.avatarKey);
  const label = avatarLabel(props.avatarKey);
  const srcWebp = avatarSrcWebp(props.avatarKey);
  const srcHeif = avatarSrcHeif(props.avatarKey);
  const srcPng = avatarSrcPng(props.avatarKey);
  const gender = avatarGender(props.avatarKey);
  const [srcMode, setSrcMode] = useState<"webp" | "heif" | "png" | "none">(
    "webp",
  );
  const ring =
    gender === "f"
      ? "border-pink-400/30 shadow-[0_0_0_1px_rgba(236,72,153,0.22)_inset]"
      : "border-sky-400/30 shadow-[0_0_0_1px_rgba(56,189,248,0.22)_inset]";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl border bg-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${ring} ${dim} ${props.className ?? ""}`}
      aria-label={`Avatar: ${label}`}
      title={label}
    >
      {srcMode !== "none" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            srcMode === "webp"
              ? srcWebp
              : srcMode === "heif"
                ? srcHeif
                : srcPng
          }
          alt=""
          className="h-full w-full rounded-2xl object-cover"
          onError={() =>
            setSrcMode((m) =>
              m === "webp" ? "heif" : m === "heif" ? "png" : "none",
            )
          }
          draggable={false}
        />
      ) : (
        <span aria-hidden className="font-extrabold tracking-tight text-gray-100">
          {short}
        </span>
      )}
    </span>
  );
}

