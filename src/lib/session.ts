import { cookies } from "next/headers";

// Mock session layer standing in for a real identity provider (Auth0).
// Swap this file for @auth0/nextjs-auth0's getSession()/withApiAuthRequired
// once a real Auth0 tenant is wired up — everything downstream (middleware,
// pages) only depends on the shape returned here.

const COOKIE_NAME = "wv_session";

export type Session = {
  name: string;
  email: string;
};

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function setSession(session: Session) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
