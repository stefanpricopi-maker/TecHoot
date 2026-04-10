"use server";

import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import {
  ADMIN_TOOLS_AUTH_COOKIE,
  ADMIN_TOOLS_COOKIE_MAX_AGE,
  getAdminToolsSessionTokenFromEnv,
  sha256DigestUtf8,
} from "@/lib/admin-tools-auth";

export async function loginAdminTools(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.ADMIN_TOOLS_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      error:
        "ADMIN_TOOLS_SECRET nu e setat. Adaugă-l în .env.local sau dezactivează protecția.",
    };
  }

  const a = await sha256DigestUtf8(String(password ?? ""));
  const b = await sha256DigestUtf8(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Parolă incorectă." };
  }

  const token = await getAdminToolsSessionTokenFromEnv();
  if (!token) {
    return { ok: false, error: "Eroare internă la generarea sesiunii." };
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set(ADMIN_TOOLS_AUTH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TOOLS_COOKIE_MAX_AGE,
  });

  return { ok: true };
}

export async function logoutAdminTools(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_TOOLS_AUTH_COOKIE);
}
