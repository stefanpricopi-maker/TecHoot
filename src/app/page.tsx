import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">kahoot-live</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/host"
          className="rounded-lg border border-[color:var(--foreground)]/20 px-5 py-2.5 text-center font-medium transition-colors hover:bg-[color:var(--foreground)]/10"
        >
          Pagina de Admin (test)
        </Link>
        <Link
          href="/join"
          className="rounded-lg border border-[color:var(--foreground)]/20 px-5 py-2.5 text-center font-medium transition-colors hover:bg-[color:var(--foreground)]/10"
        >
          Intră în joc
        </Link>
      </div>
    </div>
  );
}
