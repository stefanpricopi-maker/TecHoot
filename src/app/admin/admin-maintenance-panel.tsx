"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getAdminMaintenanceStats,
  runAdminCleanupOldData,
} from "@/app/actions/game-actions";

export function AdminMaintenancePanel() {
  const [stats, setStats] = useState<
    Awaited<ReturnType<typeof getAdminMaintenanceStats>> | null
  >(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [cleanupDays, setCleanupDays] = useState("2");
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    const res = await getAdminMaintenanceStats();
    setStats(res);
    if (!res.ok) {
      setLoadErr(res.error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runCleanup = async () => {
    const d = Math.floor(Number(cleanupDays));
    if (!window.confirm(
      `Ștergi sesiunile vechi (lobby / ended / expirate) mai vechi de ${d} zile? Această acțiune nu poate fi anulată.`,
    )) {
      return;
    }
    setCleanupBusy(true);
    setCleanupMsg(null);
    try {
      const res = await runAdminCleanupOldData(d);
      if (!res.ok) {
        setCleanupMsg(res.error);
        return;
      }
      setCleanupMsg(`Șterse ${res.deletedSessions} sesiuni (raport SQL).`);
      void load();
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h2 className="text-base font-extrabold tracking-tight text-gray-100">
        Întreținere
      </h2>
      <p className="text-sm text-gray-400">
        Statistici din baza de date și curățare sesiuni prin funcția SQL{" "}
        <code className="text-xs text-[#f59e0b]">cleanup_old_data</code>.
      </p>

      {loadErr != null && (
        <p className="text-sm text-red-400" role="alert">
          {loadErr}
        </p>
      )}

      {stats?.ok === true && (
        <div className="grid gap-3 rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Quiz-uri
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#f59e0b]">
              {stats.quizCount}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Întrebări totale
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#f59e0b]">
              {stats.questionCount}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Sesiuni (toate)
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-gray-100">
              {stats.sessionCount}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Sesiuni non-finished
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-gray-100">
              {stats.activeSessionCount}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Service role:</span>{" "}
              {stats.serviceRoleConfigured ? (
                <span className="text-emerald-400/90">configurat</span>
              ) : (
                <span className="text-red-400">lipsește pe server</span>
              )}
              {" · "}
              <span className="font-semibold text-gray-400">
                ADMIN_TOOLS_SECRET:
              </span>{" "}
              {stats.adminToolsSecretConfigured ? (
                <span className="text-emerald-400/90">setat (middleware activ)</span>
              ) : (
                <span className="text-amber-200/80">ne setat (acces /admin liber)</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h3 className="text-sm font-extrabold text-amber-200/95">
          Curățare sesiuni vechi
        </h3>
        <p className="mt-2 text-xs text-gray-400">
          Apelează RPC-ul din migrarea de producție: șterge sesiuni încheiate /
          expirate / lobby foarte vechi (în funcție de interval).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-gray-300">
            <span className="mb-1 block text-xs font-semibold text-gray-500">
              Mai vechi de (zile)
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={cleanupDays}
              onChange={(e) => setCleanupDays(e.target.value)}
              className="min-h-11 w-24 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 text-gray-100 shadow-inner"
            />
          </label>
          <button
            type="button"
            onClick={() => void runCleanup()}
            disabled={cleanupBusy}
            className="min-h-11 rounded-2xl border border-red-500/40 bg-red-500/15 px-5 text-sm font-bold text-red-200 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            {cleanupBusy ? "…" : "Rulează cleanup"}
          </button>
        </div>
        {cleanupMsg != null && (
          <p className="mt-3 text-sm text-gray-300">{cleanupMsg}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void load()}
        className="text-sm font-semibold text-[#f59e0b] underline-offset-4 hover:underline"
      >
        Reîncarcă statisticile
      </button>
    </section>
  );
}
