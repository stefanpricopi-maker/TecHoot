"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  deleteQuizQuestionAdmin,
  listQuizQuestionsAdminPage,
  listQuizzes,
  updateQuizQuestionAdmin,
  type AdminQuestionRowDto,
} from "@/app/actions/game-actions";

export function AdminQuestionsPanel() {
  const [quizzes, setQuizzes] = useState<{ id: string; title: string | null }[]>(
    [],
  );
  const [quizzesErr, setQuizzesErr] = useState<string | null>(null);
  const [quizId, setQuizId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [questions, setQuestions] = useState<AdminQuestionRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminQuestionRowDto | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editOptions, setEditOptions] = useState(["", "", "", ""]);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editTimeLimit, setEditTimeLimit] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setQuizzesErr(null);
      const res = await listQuizzes();
      if (!res.ok) {
        setQuizzesErr(res.error);
        return;
      }
      setQuizzes(res.quizzes);
      setQuizId((prev) => {
        if (prev && res.quizzes.some((q) => q.id === prev)) return prev;
        return res.quizzes[0]?.id ?? "";
      });
    })();
  }, []);

  const loadPage = useCallback(
    async (qid: string, p: number) => {
      if (!qid) {
        setQuestions([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      setListErr(null);
      try {
        const res = await listQuizQuestionsAdminPage(qid, p);
        if (!res.ok) {
          setListErr(res.error);
          setQuestions([]);
          setTotal(0);
          return;
        }
        setQuestions(res.questions);
        setTotal(res.total);
        setPage(res.page);
        setPageSize(res.pageSize);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPage(quizId, page);
  }, [quizId, page, loadPage]);

  useEffect(() => {
    if (!loading && quizId && questions.length === 0 && total > 0) {
      const lastPage = Math.max(1, Math.ceil(total / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
      }
    }
  }, [loading, quizId, questions.length, total, page, pageSize]);

  const openEdit = (row: AdminQuestionRowDto) => {
    setSaveErr(null);
    setEditing(row);
    setEditPrompt(row.prompt);
    const o = [...row.options];
    while (o.length < 4) o.push("");
    setEditOptions(o.slice(0, 4));
    setEditCorrect(row.correct_option_index);
    setEditTimeLimit(
      row.time_limit_seconds != null ? String(row.time_limit_seconds) : "",
    );
  };

  const closeEdit = () => {
    setEditing(null);
    setSaveErr(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaveBusy(true);
    setSaveErr(null);
    const opts = editOptions.map((x) => x.trim()).filter(Boolean);
    const timeRaw = editTimeLimit.trim();
    const timeLimitSeconds =
      timeRaw === "" ? null : Math.floor(Number(timeRaw));
    try {
      const res = await updateQuizQuestionAdmin({
        questionId: editing.id,
        prompt: editPrompt,
        options: opts,
        correctOptionIndex: editCorrect,
        timeLimitSeconds,
      });
      if (!res.ok) {
        setSaveErr(res.error);
        return;
      }
      closeEdit();
      void loadPage(quizId, page);
    } finally {
      setSaveBusy(false);
    }
  };

  const removeQuestion = async (row: AdminQuestionRowDto) => {
    if (
      !window.confirm(
        "Ștergi definitiv această întrebare? (Nu se poate anula.)",
      )
    ) {
      return;
    }
    setDeleteBusyId(row.id);
    try {
      const res = await deleteQuizQuestionAdmin(row.id);
      if (!res.ok) {
        setListErr(res.error);
        return;
      }
      void loadPage(quizId, page);
    } finally {
      setDeleteBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginationBar = (marginClass = "") =>
    quizId ? (
      <div
        className={`flex flex-col gap-3 border-t border-gray-700/50 pt-6 sm:flex-row sm:items-center sm:justify-between ${marginClass}`}
      >
        <p className="text-sm text-gray-400">
          <span className="font-semibold tabular-nums text-[#f59e0b]">
            {total}
          </span>{" "}
          întrebări · Pagina{" "}
          <span className="tabular-nums text-gray-100">{page}</span> /{" "}
          <span className="tabular-nums text-gray-100">{totalPages}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-2 text-sm font-semibold text-gray-100 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            Înapoi
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-2 text-sm font-semibold text-gray-100 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            Înainte
          </button>
        </div>
      </div>
    ) : null;

  const handleQuizChange = (nextId: string) => {
    setQuizId(nextId);
    setPage(1);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
      <h2 className="text-base font-extrabold tracking-tight text-gray-100">
        Modificare întrebări
      </h2>
      <p className="text-sm text-gray-400">
        Alege un quiz, apoi editează sau șterge întrebări (câte{" "}
        {pageSize} pe pagină). Modificările folosesc cheia service din server.
      </p>

      {quizzesErr != null && (
        <p className="text-sm text-red-400">{quizzesErr}</p>
      )}

      <label className="block space-y-2 text-sm font-medium text-gray-100">
        Quiz din baza de date
        <select
          value={quizId}
          onChange={(e) => handleQuizChange(e.target.value)}
          disabled={quizzes.length === 0}
          className="min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-2 text-gray-100 shadow-inner disabled:opacity-50"
        >
          {quizzes.length === 0 ? (
            <option value="">— Niciun quiz —</option>
          ) : (
            quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title?.trim() ? q.title : q.id}
              </option>
            ))
          )}
        </select>
      </label>

      {listErr != null && (
        <p className="text-sm text-red-400" role="alert">
          {listErr}
        </p>
      )}

      {paginationBar()}

      {loading && (
        <p className="text-sm text-gray-500">Se încarcă întrebările…</p>
      )}

      {!loading && quizId && questions.length === 0 && total === 0 && (
        <p className="text-sm text-gray-500">
          Acest quiz nu are încă întrebări.
        </p>
      )}

      <ul className="space-y-4">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex gap-4 rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-4 shadow-inner"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                #{q.order_index} · limită{" "}
                {q.time_limit_seconds ?? "—"}s · corect:{" "}
                {q.correct_option_index + 1}
              </p>
              <p className="text-sm font-semibold leading-snug text-gray-100">
                {q.prompt}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-400">
                {q.options.map((opt, i) => (
                  <li
                    key={i}
                    className={
                      i === q.correct_option_index
                        ? "font-semibold text-emerald-400/90"
                        : ""
                    }
                  >
                    {opt}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex shrink-0 flex-col gap-2 self-start pt-1">
              <button
                type="button"
                onClick={() => openEdit(q)}
                disabled={deleteBusyId != null}
                className="grid size-11 place-items-center rounded-2xl border border-gray-700/50 bg-[#1a2236] text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40"
                aria-label="Editează întrebarea"
                title="Editează"
              >
                <Pencil className="size-5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => void removeQuestion(q)}
                disabled={deleteBusyId === q.id}
                className="grid size-11 place-items-center rounded-2xl border border-red-500/35 bg-red-500/10 text-red-300 transition-transform hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40"
                aria-label="Șterge întrebarea"
                title="Șterge"
              >
                <Trash2 className="size-5" strokeWidth={1.75} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {paginationBar("mt-6")}

      {editing != null && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-question-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-xl">
            <h3
              id="edit-question-title"
              className="text-lg font-extrabold text-[#f59e0b]"
            >
              Editează întrebarea
            </h3>
            {saveErr != null && (
              <p className="mt-3 text-sm text-red-400">{saveErr}</p>
            )}
            <label className="mt-4 block space-y-2 text-sm font-medium text-gray-200">
              Întrebare
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner"
              />
            </label>
            {[0, 1, 2, 3].map((i) => (
              <label
                key={i}
                className="mt-3 block space-y-2 text-sm font-medium text-gray-200"
              >
                Variantă {i + 1}
                <input
                  type="text"
                  value={editOptions[i] ?? ""}
                  onChange={(e) => {
                    const next = [...editOptions];
                    next[i] = e.target.value;
                    setEditOptions(next);
                  }}
                  className="min-h-11 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner"
                />
              </label>
            ))}
            <p className="mt-2 text-xs text-gray-500">
              Lipsă la variantă = ignorat; trebuie să rămână 2–4 variante
              completate.
            </p>
            <label className="mt-4 block space-y-2 text-sm font-medium text-gray-200">
              Răspuns corect (număr variantă)
              <select
                value={editCorrect}
                onChange={(e) => setEditCorrect(Number(e.target.value))}
                className="min-h-11 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner"
              >
                {[0, 1, 2, 3].map((i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block space-y-2 text-sm font-medium text-gray-200">
              Limită timp (secunde, goal = implicit DB / app)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="ex. 30"
                value={editTimeLimit}
                onChange={(e) => setEditTimeLimit(e.target.value)}
                className="min-h-11 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner"
              />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saveBusy}
                className="rounded-2xl bg-[#f59e0b] px-5 py-2.5 text-sm font-bold text-[#0a0f1e] disabled:opacity-50"
              >
                {saveBusy ? "Se salvează…" : "Salvează"}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saveBusy}
                className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-5 py-2.5 text-sm font-semibold text-gray-200"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
