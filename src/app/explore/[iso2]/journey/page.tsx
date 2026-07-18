import { notFound } from "next/navigation";
import { findCountry } from "@/lib/country-index";
import { findAgentIdentity, getAgentIdentities } from "@/lib/agents";
import { localTimeFromLongitude } from "@/lib/local-time";
import JourneyPlanner from "@/components/journey/journey-planner";
import GuidePicker from "@/components/journey/guide-picker";

export default async function JourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ iso2: string }>;
  searchParams: Promise<{ guide?: string }>;
}) {
  const { iso2 } = await params;
  const { guide } = await searchParams;

  const country = findCountry(iso2);
  if (!country) notFound();

  const agent = guide ? findAgentIdentity(country, guide) : null;

  // An unknown or missing guide is a recoverable state, not an error — the
  // user can pick one here instead of being sent back to the globe.
  if (!agent) {
    return (
      <GuidePicker country={country} guides={getAgentIdentities(country)} />
    );
  }

  return (
    <JourneyPlanner
      country={country}
      guide={agent}
      localTime={localTimeFromLongitude(country.lng)}
    />
  );
}
