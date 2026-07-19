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
      <h1 className="mt-2 font-serif text-3xl text-cream">
        Who would you like to walk with?
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        These are the guides you could meet around {country.capital}.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            href={`/explore/${country.iso2}/journey?guide=${guide.id}`}
            className="flex items-center justify-between rounded-xl border border-cream/10 bg-cream/5 px-4 py-3.5 transition-colors hover:border-apricot/40 hover:bg-apricot/10"
          >
            <div>
              <div className="flex items-center gap-1.5 text-sm text-cream">
                <span className="text-xs text-cream/40">
                  {guide.gender === "female" ? "♀" : "♂"}
                </span>
                {guide.name}
              </div>
              <div className="text-xs text-cream/45">{country.capital}</div>
            </div>
            <span className="text-cream/40">→</span>
          </Link>
        ))}
      </div>
    </JourneyShell>
  );
}
