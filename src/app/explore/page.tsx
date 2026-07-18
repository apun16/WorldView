import CultureGlobe from "@/components/globe/culture-globe";
import { auth0 } from "@/lib/auth0";

export default async function ExplorePage() {
  const session = await auth0.getSession();
  const userName = session?.user?.name || session?.user?.email || "Explorer";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#05070d]">
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm tracking-tight text-zinc-200 sm:left-10 sm:top-8">
        <span className="text-sky-300">◉</span>
        <span className="font-medium">worldview</span>
      </div>

      {session && (
        <div className="absolute right-6 top-6 z-10 flex items-center gap-3 font-mono text-xs text-zinc-400 sm:right-10 sm:top-8">
          <span>{userName}</span>
          <a href="/auth/logout" className="text-zinc-500 hover:text-zinc-300">
            log out
          </a>
        </div>
      )}

      <CultureGlobe />
    </main>
  );
}
