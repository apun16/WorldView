"use server";

import { redirect } from "next/navigation";

export async function loginWithAuth0() {
  redirect("/auth/login?returnTo=/explore");
}

export async function signupWithAuth0() {
  redirect("/auth/login?screen_hint=signup&returnTo=/explore");
}

export async function logoutWithAuth0() {
  redirect("/auth/logout");
}
