import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { findCountry } from "@/lib/country-index";
import { findAgentIdentity } from "@/lib/agents";
import { parseStopsParam } from "@/lib/walk/walk-plan";
import { buildWalkScript } from "@/lib/walk/walk-script";
import { GLOBE_PALETTES } from "@/lib/globe-palettes";
import { findStreetPhoto } from "@/lib/mapillary";

// The scene is client-only, like the globe.
const WalkExperience = dynamic(() => import("@/components/walk/walk-experience"));

export default async function WalkPage({
  params,
  searchParams,
}: {
  params: Promise<{ iso2: string }>;
  searchParams: Promise<{ guide?: string; stops?: string; lang?: string }>;
}) {
  const { iso2 } = await params;
  const { guide, stops: rawStops, lang } = await searchParams;

  const country = findCountry(iso2);
  if (!country) notFound();

  // A missing guide or a hand-edited route is recoverable: send the user back
  // to the planner rather than showing an error, matching how the journey
  // route handles an unknown guide.
  const agent = guide ? findAgentIdentity(country, guide) : null;
  if (!agent) redirect(`/explore/${country.iso2}/journey`);

  const stops = parseStopsParam(rawStops);
  if (!stops) redirect(`/explore/${country.iso2}/journey?guide=${agent.id}`);

  const language = lang ?? country.languages[0] ?? null;
  const script = buildWalkScript(country, agent, stops, language);

  // Resolved here so the photographer can be credited. Next dedupes this with
  // the identical fetch inside /api/street-photo, so it is one upstream call.
  const streetPhoto = stops.includes("street") ? await findStreetPhoto(country) : null;

  return (
    <WalkExperience
      country={country}
      guide={agent}
      stops={stops}
      script={script}
      accentColor={GLOBE_PALETTES[2].selected}
      streetCredit={streetPhoto?.creator ?? null}
    />
  );
}
