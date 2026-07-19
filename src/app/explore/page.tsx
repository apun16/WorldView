import CultureGlobe from "@/components/globe/culture-globe";
import { auth0 } from "@/lib/auth0";
import { logoutWithAuth0 } from "@/lib/auth-actions";

export default async function ExplorePage() {
  const session = await auth0.getSession();
  const userName = session?.user?.name || session?.user?.email || "Explorer";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-dusk">
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-serif text-lg tracking-tight text-cream sm:left-10 sm:top-8">
        <span className="text-apricot">◉</span>
        <span>worldview</span>
      </div>

      {session && (
        <form
          action={logoutWithAuth0}
          className="absolute right-6 top-6 z-10 flex items-center gap-3 text-xs text-cream/55 sm:right-10 sm:top-8"
        >
          <span>{userName}</span>
          <button
            type="submit"
            className="text-cream/40 transition-colors hover:text-cream/80"
          >
            log out
          </button>
        </form>
      )}

      <CultureGlobe />
    </main>
  );
}
