import Link from "next/link";

export default function Home() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden px-4 py-safe pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-gray-100">
      {/* Solid base + animated diagonal pattern (slow drift), home route only */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#0a0f1e]"
        aria-hidden
      />
      {/* Static diagonal hints (no motion — avoids tiling seams); grid layer drifts slowly */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[repeating-linear-gradient(-34deg,transparent_0,transparent_22px,rgba(248,250,252,0.035)_22px,rgba(248,250,252,0.035)_23px)] opacity-25"
        aria-hidden
      />
      <div
        className="home-page-grid-pattern pointer-events-none fixed inset-0 -z-10 opacity-[0.4]"
        aria-hidden
      />
      <div className="relative z-0 mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-700/50 bg-[#1a2236] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          Live quiz
        </div>

        <header className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#f59e0b] sm:text-5xl md:text-6xl">
            TEChoot-live
          </h1>
        </header>

        <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/host"
            className="group relative overflow-hidden rounded-2xl border border-gray-700/50 bg-[#f59e0b] px-6 py-5 text-center text-base font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:py-6"
          >
            <span className="relative z-10">Creează joc</span>
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-amber-300/50 blur-2xl" />
            </span>
          </Link>

          <Link
            href="/join"
            className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-6 py-5 text-center text-base font-bold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] hover:border-[#f59e0b]/40 active:scale-[0.98] sm:py-6"
          >
            Intră în joc
          </Link>
        </div>

        <div className="grid w-full max-w-md grid-cols-4 gap-3">
          <div className="h-2 rounded-full bg-red-500 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2)]" />
          <div className="h-2 rounded-full bg-blue-600 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2)]" />
          <div className="h-2 rounded-full bg-amber-400 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2)]" />
          <div className="h-2 rounded-full bg-emerald-500 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2)]" />
        </div>

        <p className="text-xs text-gray-400">
          Tip: dacă nu pornește audio-ul, dă un tap oriunde pe ecran.
        </p>
      </div>
    </div>
  );
}
