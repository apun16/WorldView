import Link from "next/link";
import CultureGlobe from "@/components/globe/culture-globe";
import { auth0 } from "@/lib/auth0";

export default async function ExplorePage() {
  const session = await auth0.getSession();

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#05070d]">
      <div className="absolute left-6 top-6 z-10 flex items-center gap-3 font-mono text-sm tracking-tight text-zinc-200 sm:left-10 sm:top-8">
        <Link
          href="/explore"
          className="font-medium transition-colors hover:text-white"
        >
          worldview
        </Link>
        {session && (
          <a
            href="/auth/logout"
            className="ml-1 font-mono text-xs text-zinc-500 hover:text-zinc-300"
          >
            log out
          </a>
        )}
      </div>

      <CultureGlobe />
    </main>
  );
}
