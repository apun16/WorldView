import AsciiScene from "@/components/hero/ascii-scene";
import GreetingTicker from "@/components/hero/greeting-ticker";

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#05070d]">
      {/* ASCII-rendered scenes of the world */}
      <AsciiScene />

      {/* legibility scrims */}
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(5,7,13,0.35)_0%,_rgba(5,7,13,0.72)_70%,_rgba(5,7,13,0.9)_100%)]" />

      {/* wordmark */}
      <div className="absolute left-6 top-6 flex items-center gap-2 font-mono text-sm tracking-tight text-zinc-200 sm:left-10 sm:top-8">
        <span className="text-sky-300">◉</span>
        <span className="font-medium">worldview</span>
      </div>

      {/* centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-tight text-zinc-50 sm:text-6xl md:text-7xl">
          See the world through
          <br />
          the people who live in it
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-300/90 sm:text-base">
          An interactive globe where every place has a voice. Meet someone local,
          walk their streets, and learn their language one real conversation at a
          time.
        </p>

        <div className="mt-9 flex items-center gap-4">
          <a
            href="#"
            className="rounded-full bg-sky-400 px-7 py-2.5 text-sm font-medium text-[#05070d] transition-colors hover:bg-sky-300"
          >
            Sign up
          </a>
          <a
            href="#"
            className="rounded-full border border-white/15 px-7 py-2.5 text-sm font-medium text-zinc-100 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/5"
          >
            Log in
          </a>
        </div>
      </div>

      {/* rotating multilingual greeting */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
        <GreetingTicker />
      </div>
    </main>
  );
}
