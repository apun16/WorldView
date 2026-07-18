import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="welcome back"
      title="Log in to WorldView"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-sky-300 hover:text-sky-200">
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Plain <a> required: /auth/login must be a full-page GET (Auth0 SDK). */}
        <a
          href="/auth/login?returnTo=/explore"
          className="mt-2 rounded-full bg-sky-400 px-5 py-2.5 text-center text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
        >
          Continue with Auth0
        </a>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          This opens your Auth0 Universal Login flow.
        </p>
      </div>
    </AuthShell>
  );
}
