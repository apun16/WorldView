import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import { mockSignup } from "@/lib/auth-actions";

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
      <form action={mockSignup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-mono text-xs text-zinc-400">
            name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Ada Lovelace"
            className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-mono text-xs text-zinc-400">
            email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-mono text-xs text-zinc-400">
            password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400/50"
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
        >
          Sign up
        </button>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          demo mode — no verification, nothing is stored beyond this session
        </p>
      </form>
    </AuthShell>
  );
}
