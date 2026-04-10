"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  importQuizQuestionsBatchAdmin,
  listQuizzes,
} from "@/app/actions/game-actions";
import {
  parseBlockFormatText,
  parseJsonExodShape,
  parseQuestionsCsv,
  validateQuizImportItemDraft,
  type QuizImportItemDraft,
} from "@/lib/quiz-import-parsers";

type SourceTab = "json" | "csv" | "blocks";

type PreviewRow = {
  key: string;
  sourceLabel: string;
  item: QuizImportItemDraft;
  error: string | null;
};

const JSON_EXAMPLE = `[
  {
    "question": "Exemplu: Cine a scos pe Israel din Egipt?",
    "options": ["Aaron", "Moise", "Iosua", "Faraon"],
    "correct": 1
  }
]`;

export function AdminQuizImportPanel(props: {
  onGoToQuestions?: () => void;
  quizzesRevision?: number;
}) {
  const [quizzes, setQuizzes] = useState<{ id: string; title: string | null }[]>(
    [],
  );
  const [quizzesErr, setQuizzesErr] = useState<string | null>(null);
  const [quizId, setQuizId] = useState("");
  const [sourceTab, setSourceTab] = useState<SourceTab>("json");

  const [jsonText, setJsonText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [blocksText, setBlocksText] = useState("");

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  const [defaultTime, setDefaultTime] = useState("30");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

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
  }, [props.quizzesRevision]);

  const selectedQuizTitle = useMemo(() => {
    const q = quizzes.find((x) => x.id === quizId);
    return (q?.title ?? "").trim();
  }, [quizzes, quizId]);

  const buildPreviewFromDrafts = useCallback(
    (
      drafts: { label: string; item: QuizImportItemDraft }[],
    ): PreviewRow[] => {
      return drafts.map((d, i) => ({
        key: `${d.label}-${i}-${d.item.prompt.slice(0, 24)}`,
        sourceLabel: d.label,
        item: d.item,
        error: validateQuizImportItemDraft(d.item),
      }));
    },
    [],
  );

  const handleParseJson = useCallback(() => {
    setImportResult(null);
    const parsed = parseJsonExodShape(jsonText);
    if (!parsed.ok) {
      setParseMsg(parsed.message);
      setPreviewRows([]);
      return;
    }
    setParseMsg(
      `Parsat ${parsed.items.length} rând(uri) din JSON. Verifică previzualizarea.`,
    );
    setPreviewRows(
      buildPreviewFromDrafts(
        parsed.items.map((item, i) => ({
          label: `#${i + 1}`,
          item,
        })),
      ),
    );
  }, [jsonText, buildPreviewFromDrafts]);

  const handleParseCsv = useCallback(() => {
    setImportResult(null);
    if (!selectedQuizTitle) {
      setParseMsg("Alege un quiz — filtrăm rândurile după coloana quiz_title.");
      setPreviewRows([]);
      return;
    }
    const { headerError, rows } = parseQuestionsCsv(csvText, selectedQuizTitle);
    if (headerError) {
      setParseMsg(headerError);
      setPreviewRows([]);
      return;
    }
    const preview = rows.map((r) => {
      if (r.ok) {
        return {
          key: `csv-${r.rowIndex}`,
          sourceLabel: `Linia ${r.rowIndex + 1}`,
          item: r.item,
          error: validateQuizImportItemDraft(r.item),
        };
      }
      return {
        key: `csv-err-${r.rowIndex}`,
        sourceLabel: `Linia ${r.rowIndex + 1}`,
        item: { prompt: "(invalid)", options: ["—"], correctOptionIndex: 0 },
        error: r.message,
      };
    });
    setPreviewRows(preview);
    const okCount = rows.filter((r) => r.ok).length;
    const bad = rows.length - okCount;
    setParseMsg(
      `CSV: ${okCount} rând(uri) recunoscute${bad ? `, ${bad} cu erori` : ""} (quiz_title = „${selectedQuizTitle}”).`,
    );
  }, [csvText, selectedQuizTitle]);

  const handleParseBlocks = useCallback(() => {
    setImportResult(null);
    const { blocks } = parseBlockFormatText(blocksText);
    if (blocks.length === 0) {
      setParseMsg("Nu am găsit nici un bloc. Separă blocurile cu o linie ---.");
      setPreviewRows([]);
      return;
    }
    setPreviewRows(
      blocks.map((r, i) =>
        r.ok
          ? {
              key: `blk-${i}`,
              sourceLabel: `Bloc ${r.rowIndex + 1}`,
              item: r.item,
              error: validateQuizImportItemDraft(r.item),
            }
          : {
              key: `blk-err-${i}`,
              sourceLabel: `Bloc ${r.rowIndex + 1}`,
              item: { prompt: "(invalid)", options: ["—"], correctOptionIndex: 0 },
              error: r.message,
            },
      ),
    );
    const ok = blocks.filter((b) => b.ok).length;
    setParseMsg(
      `${blocks.length} bloc(uri), ${ok} cu structură validă (verifică și coloana Eroare).`,
    );
  }, [blocksText]);

  const validItems = useMemo(
    () => previewRows.filter((r) => r.error == null).map((r) => r.item),
    [previewRows],
  );

  const handleImport = useCallback(async () => {
    setImportResult(null);
    if (!quizId) {
      setImportResult("Alege un quiz.");
      return;
    }
    if (validItems.length === 0) {
      setImportResult("Nu există rânduri valide de importat. Apasă mai întâi „Parsează”.");
      return;
    }
    const t = Math.floor(Number(defaultTime));
    if (!Number.isFinite(t) || t <= 0) {
      setImportResult("Limită timp invalidă.");
      return;
    }
    setImportBusy(true);
    try {
      const res = await importQuizQuestionsBatchAdmin({
        quizId,
        items: validItems,
        defaultTimeLimitSeconds: t,
        skipDuplicates,
      });
      if (!res.ok) {
        setImportResult(res.error);
        return;
      }
      const parts = [
        `Importate: ${res.imported}.`,
        res.skippedDuplicates > 0
          ? `Sărite (duplicate): ${res.skippedDuplicates}.`
          : null,
        res.errors.length > 0
          ? `Avertismente server: ${res.errors.length}.`
          : null,
      ].filter(Boolean);
      setImportResult(parts.join(" "));
      if (res.imported > 0) {
        setPreviewRows([]);
        setParseMsg(null);
      }
    } finally {
      setImportBusy(false);
    }
  }, [quizId, validItems, defaultTime, skipDuplicates]);

  return (
    <section className="space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-gray-100">
          Import quiz
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Lipește conținutul, apasă <span className="text-gray-200">Parsează</span>,
          verifică previzualizarea, apoi{" "}
          <span className="text-gray-200">Importă</span>. Formatul JSON este același
          ca în <code className="text-xs text-[#f59e0b]">src/data/questions/exod.json</code>{" "}
          (<code className="text-xs">question</code>,{" "}
          <code className="text-xs">options</code>,{" "}
          <code className="text-xs">correct</code>).
        </p>
        <p className="mt-2 text-xs text-amber-200/80">
          Securitate: ruta <code className="text-[#f59e0b]">/admin</code> ar trebui
          protejată în producție (middleware, Basic Auth pe host, sau secret în env) —
          acțiunile folosesc cheia service role pe server.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Flux versionat alternativ:{" "}
          <code className="text-gray-400">templates/questions_import_template.csv</code> +{" "}
          <code className="text-gray-400">scripts/import_questions_from_csv.py</code>{" "}
          → SQL în Supabase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-gray-300">Quiz țintă</span>
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
          >
            {quizzes.length === 0 ? (
              <option value="">—</option>
            ) : (
              quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title ?? q.id}
                </option>
              ))
            )}
          </select>
          {quizzesErr != null && (
            <span className="mt-1 block text-xs text-red-400">{quizzesErr}</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-300">
            Limită timp implicită (sec.)
          </span>
          <input
            type="number"
            min={5}
            max={300}
            value={defaultTime}
            onChange={(e) => setDefaultTime(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={skipDuplicates}
          onChange={(e) => setSkipDuplicates(e.target.checked)}
          className="size-4 rounded border-gray-600 accent-[#f59e0b]"
        />
        Sari peste întrebări cu același text ca în DB (prompt identic)
      </label>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["json", "JSON"],
            ["csv", "CSV"],
            ["blocks", "Blocuri text"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSourceTab(id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors sm:text-sm ${
              sourceTab === id
                ? "bg-[#f59e0b] text-[#0a0f1e]"
                : "bg-[#0a0f1e] text-gray-400 hover:text-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sourceTab === "json" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Exemplu minim (poți copia structura):{" "}
            <button
              type="button"
              className="text-[#f59e0b] underline underline-offset-2"
              onClick={() => setJsonText(JSON_EXAMPLE)}
            >
              inserează exemplu
            </button>
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            rows={14}
            placeholder='[ { "question": "…", "options": ["…","…"], "correct": 0 } ]'
            className="w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] p-4 font-mono text-sm text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
          />
          <button
            type="button"
            onClick={handleParseJson}
            className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-5 text-sm font-semibold text-[#f59e0b] shadow-inner transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Parsează JSON
          </button>
        </div>
      )}

      {sourceTab === "csv" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Antet ca în template. Doar rândurile cu{" "}
            <code className="text-[#f59e0b]">quiz_title</code> egal cu titlul quiz-ului
            selectat sunt importate.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-[#f59e0b] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0a0f1e]"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void f.text().then(setCsvText);
            }}
          />
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            spellCheck={false}
            rows={12}
            placeholder="quiz_title,prompt,option_a,option_b,..."
            className="w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] p-4 font-mono text-sm text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
          />
          <button
            type="button"
            onClick={handleParseCsv}
            disabled={!quizId}
            className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-5 text-sm font-semibold text-[#f59e0b] shadow-inner transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            Parsează CSV
          </button>
        </div>
      )}

      {sourceTab === "blocks" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-4 text-xs text-gray-400">
            <p className="font-semibold text-[#f59e0b]">Format bloc</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Separă întrebările cu o linie care conține doar ---</li>
              <li>Prima linie = întrebare (opțional prefix Întrebare:)</li>
              <li>Variante: A) … B) … C) … D) …</li>
              <li>Ultima linie: Corect: B (sau 0–3)</li>
            </ul>
          </div>
          <textarea
            value={blocksText}
            onChange={(e) => setBlocksText(e.target.value)}
            spellCheck={false}
            rows={14}
            placeholder={
              "Cine a fost mama lui Moise?\nA) Iochebed\nB) Maria\nC) Țefora\nCorect: A\n---\n..."
            }
            className="w-full rounded-2xl border border-gray-700/50 bg-[#0a0f1e] p-4 font-mono text-sm text-gray-100 shadow-inner outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/25"
          />
          <button
            type="button"
            onClick={handleParseBlocks}
            className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-5 text-sm font-semibold text-[#f59e0b] shadow-inner transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Parsează blocuri
          </button>
        </div>
      )}

      {parseMsg != null && (
        <p className="text-sm text-gray-300">{parseMsg}</p>
      )}

      {previewRows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-700/40">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 bg-[#0a0f1e] text-xs uppercase tracking-wider text-gray-500">
                <th className="p-3 font-semibold">Sursă</th>
                <th className="p-3 font-semibold">Întrebare</th>
                <th className="p-3 font-semibold">Var.</th>
                <th className="p-3 font-semibold">Corect</th>
                <th className="p-3 font-semibold">Eroare</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-gray-700/30 text-gray-200"
                >
                  <td className="p-3 align-top text-xs text-gray-500">
                    {row.sourceLabel}
                  </td>
                  <td className="max-w-xs p-3 align-top text-gray-100">
                    {row.item.prompt.length > 120
                      ? `${row.item.prompt.slice(0, 120)}…`
                      : row.item.prompt}
                  </td>
                  <td className="p-3 align-top tabular-nums">
                    {row.error && row.item.options.length <= 1
                      ? "—"
                      : row.item.options.length}
                  </td>
                  <td className="p-3 align-top tabular-nums">
                    {row.error && row.item.options.length <= 1
                      ? "—"
                      : row.item.correctOptionIndex}
                  </td>
                  <td className="p-3 align-top text-xs text-red-400">
                    {row.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-gray-700/40 bg-[#0a0f1e] p-3 text-xs text-gray-500">
            Rânduri valide pentru import:{" "}
            <span className="font-semibold text-[#f59e0b]">
              {validItems.length}
            </span>{" "}
            / {previewRows.length}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={importBusy || validItems.length === 0}
          className="min-h-12 rounded-2xl border-2 border-[#f59e0b] bg-[#0a0f1e] px-6 text-sm font-extrabold uppercase tracking-wide text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
        >
          {importBusy ? "…" : `Importă ${validItems.length} întrebări`}
        </button>
        {props.onGoToQuestions != null && (
          <button
            type="button"
            onClick={props.onGoToQuestions}
            className="text-sm font-semibold text-gray-400 underline-offset-4 hover:text-[#f59e0b] hover:underline"
          >
            Deschide tab „Modificare întrebări”
          </button>
        )}
      </div>

      {importResult != null && (
        <p className="text-sm text-gray-200">{importResult}</p>
      )}
    </section>
  );
}
