import { NextResponse } from "next/server";
import { findCountry } from "@/lib/country-index";
import { findStreetPhoto, mapillaryConfigured } from "@/lib/mapillary";

// Streams a Mapillary 360 street photo for a country.
//
// A proxy rather than a redirect, for three reasons: the CDN's CORS policy is
// undocumented and a cross-origin image cannot be used as a WebGL texture; the
// signed URLs may expire, so they cannot be cached client-side; and the token
// stays on the server.
//
// A 404 is a normal answer — no token, or no coverage — and the photosphere
// falls through to its static tiers on any non-image response.

export const revalidate = 604800; // 7 days

export async function GET(request: Request) {
  const iso2 = new URL(request.url).searchParams.get("iso2");
  if (!iso2) {
    return NextResponse.json({ error: "iso2 required" }, { status: 400 });
  }

  if (!mapillaryConfigured()) {
    return NextResponse.json({ error: "mapillary not configured" }, { status: 404 });
  }

  const country = findCountry(iso2);
  if (!country) {
    return NextResponse.json({ error: "unknown country" }, { status: 404 });
  }

  const photo = await findStreetPhoto(country);
  if (!photo) {
    return NextResponse.json({ error: "no coverage" }, { status: 404 });
  }

  const upstream = await fetch(photo.url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=604800, immutable",
      // CC BY-SA: the photographer must be credited wherever this is shown.
      "X-Photo-Credit": photo.creator ?? "Mapillary contributor",
      "X-Photo-Source": `https://www.mapillary.com/app/?pKey=${photo.id}`,
    },
  });
}
