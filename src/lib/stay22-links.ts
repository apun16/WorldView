import type { StayNear } from "@/lib/stay22";
import type { DestinationId } from "@/lib/destinations";

export function stay22Href(
  iso2: string,
  opts?: {
    guide?: string | null;
    lang?: string | null;
    near?: StayNear | null;
    stops?: DestinationId[] | null;
    from?: "walk" | "globe" | null;
  }
): string {
  const params = new URLSearchParams();
  if (opts?.guide) params.set("guide", opts.guide);
  if (opts?.lang) params.set("lang", opts.lang);
  if (opts?.near) params.set("near", opts.near);
  if (opts?.stops?.length) params.set("stops", opts.stops.join(","));
  if (opts?.from) params.set("from", opts.from);
  const q = params.toString();
  return `/explore/${iso2}/stay22${q ? `?${q}` : ""}`;
}
