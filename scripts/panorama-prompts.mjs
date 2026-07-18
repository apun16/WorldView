#!/usr/bin/env node
// Prints generation prompts for the interior photospheres.
//   node scripts/panorama-prompts.mjs                 every subregion
//   node scripts/panorama-prompts.mjs southern-asia   one subregion

import {
  panoramaPrompt,
  allSubregions,
  GENERATED_DESTINATIONS,
} from "../src/lib/walk/panorama-prompts.ts";

const only = process.argv[2];
const subregions = only ? [only] : allSubregions();

if (only && !allSubregions().includes(only)) {
  console.error(`unknown subregion: ${only}`);
  console.error(`known: ${allSubregions().join(", ")}`);
  process.exit(1);
}

for (const sub of subregions) {
  console.log(`\n=== ${sub} ===`);
  for (const dest of GENERATED_DESTINATIONS) {
    console.log(`\n[${dest}]  ->  public/scenes/xr/_review/${sub}/${dest}.jpg`);
    console.log(panoramaPrompt(sub, dest));
  }
}

console.log(`
Generate with a purpose-built equirectangular tool — Skybox AI or PanoPulse.
General image models (DALL-E, Midjourney) leave a visible seam once wrapped.
Target 4096x2048 or larger, 2:1 exactly.

Then review at  http://localhost:3000/dev/panoramas
`);
