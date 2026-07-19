#!/usr/bin/env node
// Surveys Mapillary 360 coverage near every capital once, and writes a static
// manifest. At runtime the app then does at most ONE request (fetch a known
// image by id) instead of up to a dozen blind bbox searches, and skips the API
// entirely for countries known to have nothing.
//
//   node scripts/harvest-mapillary.mjs           all countries
//   node scripts/harvest-mapillary.mjs LK JP KE  just these

import { readFileSync, writeFileSync } from "node:fs";
import { COUNTRY_INDEX } from "../src/lib/country-index.ts";

const token = (readFileSync(".env.local", "utf8").match(/^MAPILLARY_TOKEN=(.*)$/m) || [])[1]?.trim();
if (!token) {
  console.error("MAPILLARY_TOKEN missing from .env.local");
  process.exit(1);
}

// The API rejects a box larger than 0.01 degrees.
const BOX = 0.009;
// Rings outward from the capital, in degrees (~111km per degree). Coverage
// clusters along a few mapped roads, so a single central box misses most cities.
const RINGS = [0, 0.01, 0.02, 0.04, 0.08];
const DIRECTIONS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
const CONCURRENCY = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(lat, lng) {
  const bbox = [lng - BOX / 2, lat - BOX / 2, lng + BOX / 2, lat + BOX / 2].join(",");
  const url =
    "https://graph.mapillary.com/images" +
    "?fields=id,creator,captured_at&is_pano=true&limit=5&bbox=" + bbox;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Authorization: `OAuth ${token}` } });
      if (r.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!r.ok) return null;
      const d = await r.json();
      return d.data?.[0] ?? null;
    } catch {
      await sleep(400);
    }
  }
  return null;
}

async function findFor(country) {
  const seen = new Set();
  for (const ring of RINGS) {
    for (const [dx, dy] of ring === 0 ? [[0, 0]] : DIRECTIONS) {
      const lat = country.capitalLat + dy * ring;
      const lng = country.capitalLng + dx * ring;
      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const hit = await search(lat, lng);
      if (hit) {
        return {
          id: hit.id,
          creator: hit.creator?.username ?? null,
          km: Math.round(ring * 111),
        };
      }
      await sleep(60);
    }
  }
  return null;
}

const only = process.argv.slice(2).map((s) => s.toUpperCase());
const targets = only.length
  ? COUNTRY_INDEX.filter((c) => only.includes(c.iso2))
  : COUNTRY_INDEX;

const found = {};
let done = 0;

async function worker(queue) {
  for (;;) {
    const country = queue.shift();
    if (!country) return;
    const hit = await findFor(country);
    done++;
    if (hit) {
      found[country.iso2] = hit;
      console.log(`  ${String(done).padStart(3)}/${targets.length}  ${country.iso2}  ${country.capital.padEnd(18)} pano ${hit.id} (+${hit.km}km)`);
    } else if (done % 10 === 0) {
      console.log(`  ${String(done).padStart(3)}/${targets.length}  …`);
    }
  }
}

const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

const entries = Object.keys(found).sort();
const body = entries
  .map((iso2) => `  ${iso2}: ${JSON.stringify(found[iso2])},`)
  .join("\n");

writeFileSync(
  "src/lib/walk/mapillary-coverage.ts",
  `// Mapillary 360 coverage near each capital, harvested by
// scripts/harvest-mapillary.mjs. Regenerate when coverage changes.
//
// Countries absent from this map have no 360 imagery near their capital, so the
// app skips the API for them entirely rather than burning requests on a search
// that has already been shown to fail.

export type MapillaryHit = {
  /** Image id, fetched directly at runtime — no bbox search needed. */
  id: string;
  /** Photographer, credited under CC BY-SA. */
  creator: string | null;
  /** How far from the capital the image was found, in km. */
  km: number;
};

export const MAPILLARY_COVERAGE: Record<string, MapillaryHit> = {
${body}
};

export function mapillaryHit(iso2: string): MapillaryHit | null {
  return MAPILLARY_COVERAGE[iso2.toUpperCase()] ?? null;
}
`
);

console.log(`\n${entries.length} of ${targets.length} countries have 360 coverage near their capital.`);
console.log(`wrote src/lib/walk/mapillary-coverage.ts`);
