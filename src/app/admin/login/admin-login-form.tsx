"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { loginAdminTools } from "@/app/actions/admin-tools-actions";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await loginAdminTools(password);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.replace(nextPath.startsWith("/") ? nextPath : "/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      {err != null && (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      )}
      <label className="block space-y-2 text-sm font-medium text-gray-200">
        Parolă
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-2 text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !password.trim()}
        className="min-h-12 w-full rounded-2xl bg-[#f59e0b] text-sm font-extrabold text-[#0a0f1e] disabled:opacity-40"
      >
        {busy ? "…" : "Intră"}
      </button>
    </form>
  );
}
