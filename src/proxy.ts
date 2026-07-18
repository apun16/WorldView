import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
  // In development with incomplete Auth0 config, skip auth checks
  const isDev = process.env.NODE_ENV === "development";
  const hasAuth0Config = process.env.AUTH0_DOMAIN && process.env.AUTH0_DOMAIN !== "dev.auth0.com";

  if (!isDev || hasAuth0Config) {
    const session = await auth0.getSession(request);
    if (request.nextUrl.pathname.startsWith("/explore") && !session) {
      const loginUrl = new URL("/auth/login?returnTo=/explore", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return await auth0.middleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
