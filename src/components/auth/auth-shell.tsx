import Link from "next/link";
import AsciiScene from "@/components/hero/ascii-scene";

export default function AuthShell({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070d] px-6">
      <AsciiScene />
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(5,7,13,0.55)_0%,_rgba(5,7,13,0.85)_65%,_rgba(5,7,13,0.96)_100%)]" />

      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 font-mono text-sm tracking-tight text-zinc-200 sm:left-10 sm:top-8"
      >
        <span className="text-sky-300">◉</span>
        <span className="font-medium">worldview</span>
      </Link>

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0d18]/80 p-8 backdrop-blur-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-3xl text-zinc-50">{title}</h1>

        <div className="mt-7">{children}</div>

        <div className="mt-6 text-center text-xs text-zinc-500">{footer}</div>
      </div>
    </main>
  );
}
