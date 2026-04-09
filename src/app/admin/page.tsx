"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminQuestionsPanel } from "./admin-questions-panel";

export default function AdminToolsPage() {
  const [tab, setTab] = useState<"refresh" | "import" | "questions">("import");

  return (
    <div className="min-h-dvh px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-gray-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Admin tools
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#f59e0b]">
              Setări & import quiz-uri
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Aici ții lucrurile “de maintenance”: refresh / import / viitoare
              setări.
            </p>
          </div>
          <Link
            href="/host"
            className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Înapoi
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:grid-cols-3 sm:gap-3">
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`rounded-xl px-3 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              tab === "import"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => setTab("refresh")}
            className={`rounded-xl px-3 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              tab === "refresh"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`rounded-xl px-3 py-3 text-xs font-bold leading-tight transition-colors sm:px-4 sm:text-sm ${
              tab === "questions"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Modificare întrebări
          </button>
        </div>

        {tab === "import" ? (
          <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <h2 className="text-base font-extrabold tracking-tight text-gray-100">
              Import quiz (CSV / JSON)
            </h2>
            <p className="text-sm text-gray-400">
              Pentru producție, importul rămâne “admin-only”. Momentan, pașii
              recomandați sunt prin migrare SQL generată (safe, versionată).
            </p>

            <div className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-5 text-sm text-gray-300">
              <p className="font-extrabold text-[#f59e0b]">CSV</p>
              <p className="mt-2 text-gray-400">
                Folosește scriptul din repo pentru a genera SQL din CSV și rulează
                în Supabase SQL editor.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-5 text-sm text-gray-300">
              <p className="font-extrabold text-[#f59e0b]">JSON</p>
              <p className="mt-2 text-gray-400">
                La fel: generezi migrarea SQL din JSON și o rulezi în Supabase.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Dacă vrei upload direct în UI (CSV/JSON), îl adăugăm separat cu un
              endpoint server-side (service role) + validări.
            </p>
          </section>
        ) : tab === "refresh" ? (
          <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <h2 className="text-base font-extrabold tracking-tight text-gray-100">
              Refresh quiz-uri
            </h2>
            <p className="text-sm text-gray-400">
              Nu mai există buton de refresh pe pagina de Admin (ca să rămână
              curată). Aici e zona pentru acțiuni de refresh/maintenance.
            </p>
            <p className="text-xs text-gray-500">
              (În viitor: “Sync quizzes”, “Cleanup sessions”, etc.)
            </p>
          </section>
        ) : (
          <AdminQuestionsPanel />
        )}
      </div>
    </div>
  );
}
