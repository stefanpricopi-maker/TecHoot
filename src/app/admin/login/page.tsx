import Link from "next/link";
import { Suspense } from "react";

import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
            Acces
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#f59e0b]">
            Admin tools
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Introdu parola setată în variabila de mediu{" "}
            <code className="text-xs text-gray-500">ADMIN_TOOLS_SECRET</code>.
            Dacă nu e setată, middleware-ul nu blochează accesul.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-gray-500">Se încarcă…</p>}>
          <AdminLoginForm />
        </Suspense>
        <Link
          href="/"
          className="block text-center text-sm text-gray-500 underline-offset-4 hover:text-[#f59e0b] hover:underline"
        >
          Înapoi acasă
        </Link>
      </div>
    </div>
  );
}
