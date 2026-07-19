import Link from "next/link";
import type { ReactNode } from "react";
import type { CountryInfo } from "@/lib/country-index";

/** Shared chrome for the journey screens: brand, country, and a way back. */
export default function JourneyShell({
  country,
  children,
}: {
  country: CountryInfo;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-dusk px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between">
          <Link
            href="/explore"
            className="flex items-center gap-2 font-serif text-lg tracking-tight text-cream transition-colors hover:text-white"
          >
            <span className="text-apricot">◉</span>
            <span>worldview</span>
          </Link>
          <Link
            href="/explore"
            className="text-xs text-cream/45 transition-colors hover:text-cream/80"
          >
            ← back to the globe
          </Link>
        </div>

        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-apricot/80">
          {country.continent} · {country.name}
        </p>

        {children}
      </div>
    </main>
  );
}
