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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-dusk px-6">
      <AsciiScene />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(21,16,32,0.55)_0%,_rgba(21,16,32,0.85)_65%,_rgba(15,11,24,0.96)_100%)]" />

      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 font-serif text-lg tracking-tight text-cream sm:left-10 sm:top-8"
      >
        <span className="text-apricot">◉</span>
        <span>worldview</span>
      </Link>

      <div className="relative w-full max-w-sm rounded-2xl border border-cream/10 bg-dusk-panel/80 p-8 backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot/80">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-3xl text-cream">{title}</h1>

        <div className="mt-7">{children}</div>

        <div className="mt-6 text-center text-xs text-cream/50">{footer}</div>
      </div>
    </main>
  );
}
