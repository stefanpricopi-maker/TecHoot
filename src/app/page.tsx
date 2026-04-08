import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(245,158,11,0.20),transparent_55%),radial-gradient(800px_circle_at_70%_90%,rgba(16,185,129,0.18),transparent_55%),linear-gradient(to_bottom,#0a0a0a,#050505)] px-4 py-safe pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Live quiz
        </div>

        <header className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            TEChoot-live
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/70 sm:text-base">
            Intră rapid, răspunde pe culori, urmărește clasamentul și ia podiumul.
          </p>
        </header>

        <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/host"
            className="group relative overflow-hidden rounded-2xl bg-white px-5 py-4 text-center font-bold text-zinc-950 shadow-lg shadow-black/30 transition-transform active:scale-[0.99] sm:py-5"
          >
            <span className="relative z-10">Creează joc</span>
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-amber-300/60 blur-2xl" />
            </span>
          </Link>

          <Link
            href="/join"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-center font-bold text-white shadow-lg shadow-black/20 backdrop-blur transition-colors active:opacity-90 hover:bg-white/10 sm:py-5"
          >
            Intră în joc
          </Link>
        </div>

        <div className="mt-2 grid w-full max-w-md grid-cols-4 gap-2">
          <div className="h-2 rounded-full bg-red-500" />
          <div className="h-2 rounded-full bg-blue-600" />
          <div className="h-2 rounded-full bg-amber-400" />
          <div className="h-2 rounded-full bg-emerald-500" />
        </div>

        <p className="mt-2 text-xs text-white/50">
          Tip: dacă nu pornește audio-ul, dă un tap oriunde pe ecran.
        </p>
      </div>
    </div>
  );
}
