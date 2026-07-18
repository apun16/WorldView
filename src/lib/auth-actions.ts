"use server";

import { redirect } from "next/navigation";
import { setSession, clearSession } from "@/lib/session";

// Mock credential check standing in for Auth0's Universal Login. Any
// non-empty name/email combination succeeds — there is no real password
// verification here, this only exists to unblock the product flow.

export async function mockLogin(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const name = email.split("@")[0] || "explorer";

  if (!email) {
    redirect("/login?error=missing-email");
  }

  await setSession({ name, email });
  redirect("/explore");
}

export async function mockSignup(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name || !email) {
    redirect("/signup?error=missing-fields");
  }

  await setSession({ name, email });
  redirect("/explore");
}

export async function mockLogout() {
  await clearSession();
  redirect("/");
}
