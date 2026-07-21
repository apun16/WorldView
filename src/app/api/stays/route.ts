import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { findCountry } from "@/lib/country-index";
import { isDestinationId, type DestinationId } from "@/lib/destinations";
import { searchStays, type StayNear } from "@/lib/stay22";

export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const iso2 = searchParams.get("iso2")?.toUpperCase();
  const nearRaw = searchParams.get("near") ?? "capital";
  const language = searchParams.get("lang");

  if (!iso2) {
    return NextResponse.json({ error: "iso2 required" }, { status: 400 });
  }

  const country = findCountry(iso2);
  if (!country) {
    return NextResponse.json({ error: "Unknown country" }, { status: 404 });
  }

  const near = parseNear(nearRaw);
  if (!near) {
    return NextResponse.json({ error: "Invalid near" }, { status: 400 });
  }

  try {
    const stays = await searchStays({
      country,
      near,
      language,
      limit: 6,
    });
    return NextResponse.json({
      stays,
      near,
      place: `${country.capital}, ${country.name}`,
    });
  } catch (err) {
    console.error("Stay22 search failed", err);
    return NextResponse.json(
      { error: "Could not load stays right now" },
      { status: 502 }
    );
  }
}

function parseNear(raw: string): StayNear | null {
  if (raw === "capital" || raw === "attraction") return raw;
  if (isDestinationId(raw)) return raw as DestinationId;
  return null;
}
