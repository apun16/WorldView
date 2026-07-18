import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
  const session = await auth0.getSession(request);

  if (request.nextUrl.pathname.startsWith("/explore") && !session) {
    const loginUrl = new URL("/auth/login?returnTo=/explore", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
