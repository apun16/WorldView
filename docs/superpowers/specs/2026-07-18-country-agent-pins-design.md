# Country agent pins — design

## Problem

Right now, clicking a country on the globe opens the culture panel but the globe
itself doesn't show that this is a place with people to meet. We want little
person-shaped markers to scatter across a country's landmass when the user
hovers or selects it, foreshadowing the "meet a character from this region"
feature described in the project brief. The number of markers should loosely
reflect the country's size.

## Scope

In scope:
- Deterministic per-country agent generation (count + placement + placeholder name)
- Rendering little-person pin markers on the globe for the hovered and/or
  selected country
- Clicking a pin selects it and shows a placeholder blurb in the side panel

Out of scope (future work):
- Real character data, conversations, ElevenLabs voices, Gemini pronunciation
  scoring, auth0 checkpoints — none of that exists yet. This feature only
  builds the visual foundation (where a character would stand) and the click
  interaction shell (what happens when you pick one), with static placeholder
  content.
- Persisting which agent the user has "met" anywhere (no backend/DB call).

## Sizing: agent count per country

Agent count is proportional to land area, log-scaled and clamped to a small
range so large countries don't overwhelm the globe:

1. At module load, `agents.ts` builds a static `iso2 → area (km²)` map by
   matching the `world-countries` package's `cca2` field against the iso2
   codes present in `public/data/countries-enriched.geojson`.
2. `minArea`/`maxArea` are computed from just the matched countries (175 of
   177 — 2 unmatched iso2 codes fall back to a fixed count of 3), not the
   full 250-country `world-countries` list, since that list has sub-1km²
   outlier territories that would skew the scale.
3. For a given country: `t = clamp01((log10(area) - log10(minArea)) / (log10(maxArea) - log10(minArea)))`,
   `count = round(2 + t * 5)`, producing a range of **2–7** agents.

This is pure and deterministic — no RNG involved in the count itself.

## Placement and identity: seeded per-country generation

For a given `CountryFeature`, `agents.ts` exposes `getCountryAgents(country): Agent[]`:

```ts
type Agent = { id: string; name: string; lat: number; lng: number };
```

- A seeded PRNG (mulberry32, seeded from a hash of the country's `iso2`) drives
  both name selection and placement, so the same country produces the same
  agents on every page load — no flicker or reshuffling on re-render.
- **Placement**: rejection-sample random points inside the country's bounding
  box (derived from its GeoJSON geometry), testing each candidate with a
  ray-casting point-in-polygon check against the geometry's exterior ring(s)
  (handles `Polygon` and `MultiPolygon`; holes are ignored — an acceptable
  imperfection for placeholder pins). Up to ~30 attempts per point; if all
  fail (very thin/sliver shapes), fall back to the country's `lat`/`lng`
  centroid already present in `CountryProperties`.
- **Naming**: each agent gets a name drawn (via the seeded PRNG) from a small
  curated pool of ~30 international first names. No attempt to culturally
  match names to the country in this iteration — that's future work once real
  character data exists.
- Results are memoized in a `Map<iso2, Agent[]>` cache inside `agents.ts` so
  repeated hovers don't redo the polygon sampling.

## Rendering

- New component `src/components/globe/country-agent-pin.tsx` renders a small
  inline SVG person-silhouette icon, styled to match the existing mono/frosted
  aesthetic. Two visual states: default (uses the active palette's `hover`
  color) and selected (uses the active palette's `selected` color, with a
  glow/ring treatment).
- `culture-globe.tsx` computes the set of countries whose agents should be
  visible: the union of `{ hovered country, panel's country when
  panel.kind === "country" }`, deduplicated by iso2, then flattens their
  `getCountryAgents()` results into one array passed to the `Globe`
  component's `htmlElementsData` prop (this is the first use of that prop —
  no conflict with existing layers).
- Pins render above the globe surface at a small fixed `htmlAltitude`.

## Interaction

- New state in `culture-globe.tsx`: `selectedAgent: { agentId: string; iso2: string } | null`.
- Clicking a pin's DOM element calls `stopPropagation()` (so it doesn't also
  fire the underlying polygon's click-to-fly-in handler), sets
  `selectedAgent`, and ensures the panel is showing that agent's country
  (opens/switches the country panel via the existing `handleCountryClick`
  flow if it isn't already showing that country).
- Changing which country is selected clears `selectedAgent`.

## Panel changes

- `culture-panel.tsx`'s `CountryView` gains a new optional prop for the
  currently selected agent. When present and it belongs to the panel's
  country, render a small card above the existing "begin the walk — coming
  soon" block:

  > **{name}** — a guide in {capital}.
  > Coming soon: walk through the market together.

- When no agent is selected, the panel looks exactly as it does today.

## Testing

No backend, so this is manual/visual verification:
- Run `npm run dev`, hover a large country (e.g. Russia, Canada) — expect
  visibly more pins (up to 7) scattered across its landmass, not spilling
  into the ocean or neighboring countries.
- Hover/select a small country (e.g. Sri Lanka, Belgium) — expect 2–3 pins.
- Click a pin — confirm it visually selects, the panel shows the placeholder
  card, and the underlying country click-to-fly-in does not also trigger.
- Move hover away from a non-selected country — its pins disappear; the
  selected country's pins persist.
- Switch palettes via the existing palette slider — pin colors update to
  match.
