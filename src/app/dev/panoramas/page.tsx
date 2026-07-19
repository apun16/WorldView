import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import PanoramaReview, { type Candidate } from "@/components/dev/panorama-review";
import { panoramaPrompt } from "@/lib/walk/panorama-prompts";
import type { DestinationId } from "@/lib/destinations";

// Dev-only. Reviews generated panorama candidates staged in
// public/scenes/xr/_review before they are promoted into the real tiers.

const REVIEW_DIR = path.join(process.cwd(), "public", "scenes", "xr", "_review");

export default async function PanoramaReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <PanoramaReview candidates={readCandidates()} />;
}

function readCandidates(): Candidate[] {
  if (!fs.existsSync(REVIEW_DIR)) return [];

  const candidates: Candidate[] = [];
  for (const subregion of fs.readdirSync(REVIEW_DIR)) {
    const dir = path.join(REVIEW_DIR, subregion);
    if (!fs.statSync(dir).isDirectory()) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;
      const full = path.join(dir, file);
      const destination = file.replace(/\.[^.]+$/, "") as DestinationId;
      const size = readImageSize(full);

      candidates.push({
        subregion,
        destination,
        url: `/scenes/xr/_review/${subregion}/${file}`,
        width: size?.width ?? 0,
        height: size?.height ?? 0,
        bytes: fs.statSync(full).size,
        prompt: panoramaPrompt(subregion, destination),
      });
    }
  }

  return candidates.sort(
    (a, b) =>
      a.subregion.localeCompare(b.subregion) ||
      a.destination.localeCompare(b.destination)
  );
}

/** Minimal JPEG/PNG header parse — avoids adding an image library for two numbers. */
function readImageSize(file: string): { width: number; height: number } | null {
  const buffer = fs.readFileSync(file);

  if (buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0/1/2 carry the dimensions; skip DHT/DQT/APPn and friends.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}
