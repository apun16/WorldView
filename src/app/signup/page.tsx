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
          <Link href="/login" className="text-apricot hover:text-[#f8cb95]">
            Log in
          </Link>
        </>
      }
    >
      <form action={signupWithAuth0} className="flex flex-col gap-4">
        <button
          type="submit"
          className="mt-2 rounded-full bg-apricot px-5 py-2.5 text-sm font-semibold text-dusk-deep transition-colors hover:bg-[#f8cb95]"
        >
          Sign up with Auth0
        </button>

        <p className="text-center text-[11px] text-cream/35">
          Auth0 will handle the sign-up experience and redirect you back here.
        </p>
      </form>
    </AuthShell>
  );
}
