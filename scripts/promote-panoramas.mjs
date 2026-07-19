#!/usr/bin/env node
// Validates reviewed panoramas and moves them into the live tiers.
//   node scripts/promote-panoramas.mjs southern-asia/market southern-asia/home
//
// The review page prints the exact command with everything you kept.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const XR = path.join(process.cwd(), "public", "scenes", "xr");
const TARGET_WIDTH = 4096;
const TARGET_HEIGHT = 2048;
const QUALITY = 60;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/promote-panoramas.mjs <subregion>/<destination> ...");
  process.exit(1);
}

function dimensions(file) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], {
    encoding: "utf8",
  });
  return {
    width: Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]),
    height: Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]),
  };
}

let promoted = 0;
let failed = 0;

for (const arg of args) {
  const [subregion, destination] = arg.split("/");
  if (!subregion || !destination) {
    console.error(`  skip  ${arg} — expected <subregion>/<destination>`);
    failed++;
    continue;
  }

  const source = [".jpg", ".jpeg", ".png"]
    .map((ext) => path.join(XR, "_review", subregion, destination + ext))
    .find(existsSync);

  if (!source) {
    console.error(`  skip  ${arg} — not found under _review/${subregion}/`);
    failed++;
    continue;
  }

  const { width, height } = dimensions(source);
  const ratio = width / height;

  // A non-2:1 image is not equirectangular; wrapping it on a sphere smears the
  // whole scene. Refuse rather than ship something subtly wrong.
  if (Math.abs(ratio - 2) > 0.02) {
    console.error(`  FAIL  ${arg} — ${width}x${height} is ${ratio.toFixed(3)}:1, need 2:1`);
    failed++;
    continue;
  }

  if (width < TARGET_WIDTH) {
    console.error(
      `  FAIL  ${arg} — ${width}px wide, need ${TARGET_WIDTH}. ` +
        `The loader skips anything under 4096, so this would never render.`
    );
    failed++;
    continue;
  }

  const outDir = path.join(XR, "_subregion", subregion);
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${destination}.jpg`);

  execFileSync("sips", [
    "-z", String(TARGET_HEIGHT), String(TARGET_WIDTH),
    "-s", "format", "jpeg",
    "-s", "formatOptions", String(QUALITY),
    source, "--out", out,
  ]);

  unlinkSync(source);
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`  ok    ${arg} -> _subregion/${subregion}/${destination}.jpg  (${kb}KB)`);
  promoted++;
}

console.log(`\n${promoted} promoted, ${failed} failed.`);
if (promoted > 0) {
  console.log("Record the source and licence of each in public/scenes/xr/ATTRIBUTION.md.");
}
