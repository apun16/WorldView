import Link from "next/link";
import type { CountryInfo } from "@/lib/country-index";
import type { AgentIdentity } from "@/lib/agents";
import JourneyShell from "@/components/journey/journey-shell";

export default function GuidePicker({
  country,
  guides,
}: {
  country: CountryInfo;
  guides: AgentIdentity[];
}) {
  return (
    <JourneyShell country={country}>
      <h1 className="mt-2 font-serif text-3xl text-zinc-50">
        Who would you like to walk with?
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        These are the guides you could meet around {country.capital}.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            href={`/explore/${country.iso2}/journey?guide=${guide.id}`}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:border-sky-400/40 hover:bg-sky-400/10"
          >
            <div>
              <div className="text-sm text-zinc-100">{guide.name}</div>
              <div className="font-mono text-[11px] text-zinc-500">
                {country.capital}
              </div>
            </div>
            <span className="text-zinc-500">→</span>
          </Link>
        ))}
      </div>
    </JourneyShell>
  );
}
