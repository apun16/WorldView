# Journey planner — design

## Problem

Selecting a guide on the globe currently dead-ends at a disabled "begin the
walk" button. The brief describes a guide walking the user through several
places — a market, a home, a school, a walk — teaching words along the way.
The full experience is VR/AR and does not exist yet. This is the preliminary
step in front of it: a planner where the user assembles the route they are
about to walk.

## Scope

In scope:
- A journey planner route with its own URL
- A typed destination catalogue (market, home, school, nature walk, street)
- Picking a route of 3–4 stops from that catalogue
- Local time-of-day for the country, derived without a network call
- Recording completed journeys to a swappable history store
- A placeholder handoff where the VR/AR experience will eventually begin

Out of scope (future work):
- The VR/AR experience itself — the CTA records the journey and lands on a
  "coming soon" state
- Live weather (OpenWeather), ElevenLabs voices, Gemini pronunciation scoring
- Real database persistence — history is localStorage behind an interface
- Reordering stops: order is pick order, and stops can be removed but not
  dragged

## Route

`src/app/explore/[iso2]/journey/page.tsx`, e.g. `/explore/LK/journey?guide=LK-0`.

Two properties fall out of existing design decisions:

- `proxy.ts` already matches `/explore/:path*`, so the route is auth-protected
  with no middleware change.
- Agents are deterministic from `iso2`, so the guide is regenerated from the
  URL rather than passed as cross-page state. The URL is the entire state and
  survives a refresh.

`params` is a `Promise` in Next 16 and is awaited in the server component.

### Avoiding a geometry round-trip

Agent *identity* (how many, and their names) derives only from `iso2` and land
area; only their *positions* need country geometry. `agents.ts` is split so
`getAgentIdentities(iso2)` returns ids and names with no geometry, sharing the
same seeded PRNG sequence as `getCountryAgents` so both agree.

Country name/capital/continent come from a new generated `country-index.ts`
(properties only, no geometry) rather than parsing the 1.4MB geojson. The
planner therefore needs neither the geojson nor the globe.

## Screen

Full-screen, matching the existing dark / mono / serif treatment:

1. **Guide header** — guide name, country, capital, local time of day.
2. **Destination catalogue** — cards with a glyph and one line on what the
   user would pick up there.
3. **Route strip** — picked stops as a numbered itinerary, each removable.
4. **CTA** — "Begin the walk with {name}", enabled at 3–4 stops. Records the
   journey, then switches to the departure placeholder.

Time of day is computed from the country's longitude (`lng / 15` offset from
UTC). It is an approximation that ignores real timezone boundaries and DST,
which is acceptable for atmosphere and costs no API key or network call.
Weather is deliberately omitted rather than faked until OpenWeather is wired.

## Journey history

`src/lib/journey-history.ts`, shaped after the existing `session.ts` Auth0
stub — a narrow interface over a swappable store:

```ts
type JourneyRecord = {
  id: string;
  iso2: string;
  guideId: string;
  guideName: string;
  stops: DestinationId[];
  startedAt: string; // ISO
};

recordJourney(record: Omit<JourneyRecord, "id" | "startedAt">): JourneyRecord
getJourneyHistory(): JourneyRecord[]
```

Backed by localStorage under a versioned key, guarded for SSR (`typeof window`).
MongoDB swaps in behind the same interface later.

This is the substrate for the cross-cultural connections in the brief: once
visits are recorded as `{country, stops, time}`, "the saffron you saw in
Marrakesh traded along this route" becomes a query over history rather than a
hardcoded special case.

## Error handling

- Unknown `iso2` → `notFound()`.
- Missing or unrecognised `guide` param → the page lists that country's guides
  and asks the user to choose, rather than erroring.
- localStorage unavailable or holding malformed JSON → history reads return an
  empty list instead of throwing.

## Testing

Manual, consistent with the repo (no test runner configured). The pure pieces —
the destination catalogue, time-of-day derivation, and the history module — are
verified with a throwaway script, as the agent placement logic was:
- agent identities from `getAgentIdentities` match `getCountryAgents` for every
  country
- time-of-day buckets are correct across the longitude range
- history round-trips records and survives malformed stored JSON
