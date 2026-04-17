import Link from "next/link";

import { createSupabaseClient } from "@/lib/supabase";
import { normalizeJoinPin } from "@/lib/game-logic";
import { getQuestionAccuracySummaryAdmin } from "@/app/actions/game-actions";

type PageProps = {
  params: Promise<{ pin: string }>;
};

function Row({
  idx,
  prompt,
  reference,
  correctPct,
  correct,
  wrong,
  answered,
}: {
  idx: number;
  prompt: string;
  reference: string | null;
  correctPct: number;
  correct: number;
  wrong: number;
  answered: number;
}) {
  return (
    <tr className="border-t border-gray-700/40">
      <td className="px-3 py-3 text-xs font-bold text-gray-300">{idx + 1}</td>
      <td className="px-3 py-3 text-sm font-semibold text-gray-100">
        <div className="line-clamp-2">{prompt}</div>
        {reference ? (
          <div className="mt-1 line-clamp-1 text-xs font-semibold text-[#f59e0b]">
            {reference}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
        {correctPct}%
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-gray-300">
        {correct}/{answered}
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-gray-300">
        {wrong}
      </td>
    </tr>
  );
}

export default async function GameSummaryPage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const pin = normalizeJoinPin(decoded);
  if (!pin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <p className="text-gray-400">PIN invalid.</p>
      </div>
    );
  }

  const supabase = createSupabaseClient();
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, results_published_at")
    .eq("pin", pin)
    .maybeSingle();
  if (sessionErr || !session?.id) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <p className="text-gray-400">Nu există sesiune cu acest PIN.</p>
      </div>
    );
  }

  if (!(session as any).results_published_at) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Joc terminat
          </p>
          <p className="mt-3 text-lg font-extrabold tracking-tight text-[#f59e0b]">
            Clasamentul nu a fost publicat încă
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Publică mai întâi clasamentul, apoi revino aici.
          </p>
          <Link
            href={`/game/results/${encodeURIComponent(pin)}`}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#f59e0b] px-8 py-3 text-sm font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]"
          >
            Înapoi la clasament
          </Link>
        </div>
      </div>
    );
  }

  const summary = await getQuestionAccuracySummaryAdmin(session.id as string);
  if (!summary.ok) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <p className="text-sm font-semibold text-red-300">{summary.error}</p>
          <Link
            href={`/game/results/${encodeURIComponent(pin)}`}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#f59e0b] px-8 py-3 text-sm font-bold text-[#0a0f1e]"
          >
            Înapoi la clasament
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0f1e]/40 px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100 backdrop-blur-sm">
      <header className="mx-auto max-w-4xl text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#f59e0b] sm:text-3xl">
          Statistici întrebări (Top 3)
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          PIN: <span className="font-mono font-extrabold text-gray-100">{pin}</span>
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/game/results/${encodeURIComponent(pin)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 text-sm font-semibold text-gray-100"
          >
            Înapoi la clasament
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-200">
            Cele mai greșite
          </h2>
          <p className="mt-2 text-xs text-gray-400">Top 3 după % corecte (minim 1 răspuns).</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-700/40 bg-[#0a0f1e]">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Întrebare</th>
                  <th className="px-3 py-2 text-right">% OK</th>
                  <th className="px-3 py-2 text-right">OK</th>
                  <th className="px-3 py-2 text-right">Greșite</th>
                </tr>
              </thead>
              <tbody>
                {summary.hardest.map((r) => (
                  <Row
                    key={r.questionIndex}
                    idx={r.questionIndex}
                    prompt={r.prompt}
                    reference={r.reference}
                    correctPct={r.correctPct}
                    correct={r.correct}
                    wrong={r.wrong}
                    answered={r.answered}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-200">
            Cele mai bine răspunse
          </h2>
          <p className="mt-2 text-xs text-gray-400">Top 3 după % corecte (minim 1 răspuns).</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-700/40 bg-[#0a0f1e]">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Întrebare</th>
                  <th className="px-3 py-2 text-right">% OK</th>
                  <th className="px-3 py-2 text-right">OK</th>
                  <th className="px-3 py-2 text-right">Greșite</th>
                </tr>
              </thead>
              <tbody>
                {summary.easiest.map((r) => (
                  <Row
                    key={r.questionIndex}
                    idx={r.questionIndex}
                    prompt={r.prompt}
                    reference={r.reference}
                    correctPct={r.correctPct}
                    correct={r.correct}
                    wrong={r.wrong}
                    answered={r.answered}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

