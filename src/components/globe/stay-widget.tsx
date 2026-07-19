"use client";

const STAY22_AID = process.env.NEXT_PUBLIC_STAY22_AID ?? "";

export default function StayWidget({
  lat,
  lng,
  place,
}: {
  lat: number;
  lng: number;
  place: string;
}) {
  if (!STAY22_AID) return null;

  const params = new URLSearchParams({
    aid: STAY22_AID,
    lat: String(lat),
    lng: String(lng),
    address: place,
    zoom: "12",
    limit: "10",
    mapstyle: "dark",
    maincolor: "38bdf8",
    fontcolor: "e2e8f0",
    hidebrandlogo: "true",
    hidelanguage: "true",
    hidesettings: "true",
  });

  return (
    <iframe
      src={`https://www.stay22.com/embed/gm?${params.toString()}`}
      className="h-[300px] w-full rounded-xl border border-white/10"
      loading="lazy"
      title={`Stays near ${place}`}
    />
  );
}
