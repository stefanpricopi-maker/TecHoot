"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  forceFinishSessionAdmin,
  listSessionsAdminPage,
  publishFinalResults,
  startGameAdmin,
  type AdminSessionRowDto,
} from "@/app/actions/game-actions";

export function AdminSessionsPanel() {
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState<AdminSessionRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listSessionsAdminPage(p);
      if (!res.ok) {
        setErr(res.error);
        setSessions([]);
        setTotal(0);
        return;
      }
      setSessions(res.sessions);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.pageSize);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const finish = async (row: AdminSessionRowDto) => {
    if (
      !window.confirm(
        `Închizi forțat sesiunea PIN ${row.pin}? Status devine „finished”.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setErr(null);
    try {
      const res = await forceFinishSessionAdmin(row.id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      void load(page);
    } finally {
      setBusyId(null);
    }
  };

  const start = async (row: AdminSessionRowDto) => {
    if (
      !window.confirm(
        `Pornești jocul pentru PIN ${row.pin}? (În Team mode pornește doar dacă toți au echipă.)`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setErr(null);
    try {
      const res = await startGameAdmin(row.id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      void load(page);
    } finally {
      setBusyId(null);
    }
  };

  const publish = async (row: AdminSessionRowDto) => {
    if (
      !window.confirm(
        `Publici clasamentul pentru PIN ${row.pin}? Jucătorii vor vedea rezultatele.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    setErr(null);
    try {
      const res = await publishFinalResults(row.id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      void load(page);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h2 className="text-base font-extrabold tracking-tight text-gray-100">
        Sesiuni live
      </h2>
      <p className="text-sm text-gray-400">
        Ultimele sesiuni create. „Închide” setează status{" "}
        <code className="text-xs text-gray-500">finished</code> și{" "}
        <code className="text-xs text-gray-500">ended_at</code>.
      </p>

      {err != null && (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Se încarcă…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500">Nicio sesiune în baza de date.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-lg font-extrabold tabular-nums text-[#f59e0b]">
                  {s.pin}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-400">{s.status}</span>
                  {" · "}
                  {s.quiz_title ?? s.quiz_id}
                </p>
                <p className="text-xs text-gray-500">
                  creată: {s.created_at.slice(0, 19).replace("T", " ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {s.status === "lobby" && (
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void start(s)}
                    className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200 disabled:opacity-40"
                  >
                    Start
                  </button>
                )}
                {s.status !== "finished" && (
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void finish(s)}
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200 disabled:opacity-40"
                  >
                    Închide forțat
                  </button>
                )}
                {s.status === "finished" && !s.results_published_at && (
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void publish(s)}
                    className="rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-xs font-bold text-[#f59e0b] disabled:opacity-40"
                  >
                    Publică clasamentul
                  </button>
                )}
                {s.status === "finished" && s.results_published_at && (
                  <Link
                    href={`/game/results/${encodeURIComponent(s.pin)}`}
                    className="rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-xs font-bold text-[#f59e0b]"
                  >
                    Clasament
                  </Link>
                )}
                <Link
                  href={`/game/host/${encodeURIComponent(s.pin)}`}
                  className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-4 py-2 text-xs font-semibold text-gray-200"
                >
                  Host
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-700/50 pt-4 text-sm text-gray-400">
          <span>
            Pagina {page} / {totalPages} ({total} sesiuni)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-gray-700/50 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Înapoi
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-gray-700/50 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Înainte
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
