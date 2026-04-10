import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_TOOLS_AUTH_COOKIE,
  getAdminToolsSessionTokenFromEnv,
} from "@/lib/admin-tools-auth";

export async function middleware(request: NextRequest) {
  const expected = await getAdminToolsSessionTokenFromEnv();
  if (expected == null) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_TOOLS_AUTH_COOKIE)?.value;
  if (token !== expected) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
