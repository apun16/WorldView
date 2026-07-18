import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import { loginWithAuth0 } from "@/lib/auth-actions";

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
      <form action={loginWithAuth0} className="flex flex-col gap-4">
        <button
          type="submit"
          className="mt-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
        >
          Continue with Auth0
        </button>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          This opens your Auth0 Universal Login flow.
        </p>
      </form>
    </AuthShell>
  );
}
