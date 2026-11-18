import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


const ROLE_ROOTS = new Set(["/admin", "/teacher", "/student", "/parent"]);

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A bare role root resolves to that role's dashboard.
  if (ROLE_ROOTS.has(pathname)) {
    return withSecurityHeaders(NextResponse.redirect(new URL(`${pathname}/dashboard`, request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|icon-|data/).*)"]
};
