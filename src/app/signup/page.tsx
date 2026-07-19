import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="start exploring"
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-sky-300 hover:text-sky-200">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Plain <a> required: /auth/login must be a full-page GET (Auth0 SDK). */}
        <a
          href="/auth/login?screen_hint=signup&returnTo=/explore"
          className="mt-2 rounded-full bg-sky-400 px-5 py-2.5 text-center text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
        >
          Sign up with Auth0
        </a>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          Auth0 will handle the sign-up experience and redirect you back here.
        </p>
      </div>
    </AuthShell>
  );
}
