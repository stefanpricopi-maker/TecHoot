"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { logoutAdminTools } from "@/app/actions/admin-tools-actions";

import { AdminMaintenancePanel } from "./admin-maintenance-panel";
import { AdminQuestionsPanel } from "./admin-questions-panel";
import { AdminQuizImportPanel } from "./admin-quiz-import-panel";
import { AdminSessionsPanel } from "./admin-sessions-panel";

export default function AdminToolsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<
    "import" | "maintenance" | "questions" | "sessions"
  >("import");
  const [quizListRevision, setQuizListRevision] = useState(0);

  const bumpQuizList = useCallback(() => {
    setQuizListRevision((n) => n + 1);
  }, []);

  const handleLogout = async () => {
    await logoutAdminTools();
    router.push("/admin/login");
    router.refresh();
  };

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
              Import, întreținere, modificare întrebări și sesiuni live.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-4 py-2 text-xs font-semibold text-gray-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors hover:text-[#f59e0b]"
            >
              Deconectare
            </button>
            <Link
              href="/host"
              className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 py-2.5 text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Înapoi
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:grid-cols-4 sm:gap-3">
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              tab === "import"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => setTab("maintenance")}
            className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              tab === "maintenance"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Întreținere
          </button>
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`rounded-xl px-2 py-3 text-xs font-bold leading-tight transition-colors sm:px-4 sm:text-sm ${
              tab === "questions"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Întrebări
          </button>
          <button
            type="button"
            onClick={() => setTab("sessions")}
            className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              tab === "sessions"
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-transparent text-gray-400 hover:text-gray-100"
            }`}
          >
            Sesiuni
          </button>
        </div>

        {tab === "import" ? (
          <AdminQuizImportPanel
            quizzesRevision={quizListRevision}
            onGoToQuestions={() => setTab("questions")}
          />
        ) : tab === "maintenance" ? (
          <AdminMaintenancePanel />
        ) : tab === "questions" ? (
          <AdminQuestionsPanel
            quizzesRevision={quizListRevision}
            onQuizzesMutated={bumpQuizList}
          />
        ) : (
          <AdminSessionsPanel />
        )}
      </div>
    </div>
  );
}
