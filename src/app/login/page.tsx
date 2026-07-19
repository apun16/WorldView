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
          <Link href="/signup" className="text-apricot hover:text-[#f8cb95]">
            Create an account
          </Link>
        </>
      }
    >
      <form action={loginWithAuth0} className="flex flex-col gap-4">
        <button
          type="submit"
          className="mt-2 rounded-full bg-apricot px-5 py-2.5 text-sm font-semibold text-dusk-deep transition-colors hover:bg-[#f8cb95]"
        >
          Continue with Auth0
        </button>

        <p className="text-center text-[11px] text-cream/35">
          This opens your Auth0 Universal Login flow.
        </p>
      </form>
    </AuthShell>
  );
}
