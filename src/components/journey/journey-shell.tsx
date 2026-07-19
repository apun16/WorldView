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
    <main className="min-h-screen w-full bg-[#05070d] px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between">
          <Link
            href="/explore"
            className="font-mono text-sm font-medium tracking-tight text-zinc-200 transition-colors hover:text-white"
          >
            worldview
          </Link>
          <Link
            href="/explore"
            className="font-mono text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← back to globe
          </Link>
        </div>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/70">
          {country.continent} · {country.name}
        </p>

        {children}
      </div>
    </main>
  );
}
