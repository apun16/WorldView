import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
  // Auth0 mounts /auth/login, /auth/logout, /auth/callback — let the SDK
  // handle those before any app redirects (must stay GET navigations).
  const authRes = await auth0.middleware(request);
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authRes;
  }

  const session = await auth0.getSession(request);

  if (request.nextUrl.pathname.startsWith("/explore") && !session) {
    const loginUrl = new URL("/auth/login?returnTo=/explore", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return authRes;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
