import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import { signupWithAuth0 } from "@/lib/auth-actions";

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
      <form action={signupWithAuth0} className="flex flex-col gap-4">
        <button
          type="submit"
          className="mt-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
        >
          Sign up with Auth0
        </button>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          Auth0 will handle the sign-up experience and redirect you back here.
        </p>
      </form>
    </AuthShell>
  );
}
