import Link from "next/link";
import AsciiScene from "@/components/hero/ascii-scene";
import GreetingTicker from "@/components/hero/greeting-ticker";

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-dusk">
      {/* ASCII-rendered scenes of the world, graded like city lights at dusk */}
      <AsciiScene />

      {/* legibility scrims */}
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(21,16,32,0.35)_0%,_rgba(21,16,32,0.72)_70%,_rgba(15,11,24,0.9)_100%)]" />

      {/* wordmark */}
      <div className="absolute left-6 top-6 flex items-center gap-2 font-serif text-lg tracking-tight text-cream sm:left-10 sm:top-8">
        <span className="text-apricot">◉</span>
        <span>worldview</span>
      </div>

      {/* centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-tight text-cream sm:text-6xl md:text-7xl">
          See the world through
          <br />
          the people who live in it
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-cream/75 sm:text-base">
          An interactive globe where every place has a voice. Meet someone local,
          walk their streets, and learn their language one real conversation at a
          time.
        </p>

        <div className="mt-9 flex items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-apricot px-7 py-2.5 text-sm font-semibold text-dusk-deep transition-colors hover:bg-[#f8cb95]"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-cream/20 px-7 py-2.5 text-sm font-medium text-cream backdrop-blur-sm transition-colors hover:border-cream/40 hover:bg-cream/5"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* rotating multilingual greeting */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
        <GreetingTicker />
      </div>
    </main>
  );
}
