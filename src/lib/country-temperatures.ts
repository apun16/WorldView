import type { CountryProperties } from "@/lib/geo-types";

// Approximate annual mean surface temperature (°C) per country, from public
// climate normals (World Bank / climate-data.org ranges). Used to colour the
// climate heatmap by real temperature rather than a latitude guess. Countries
// not listed fall back to a latitude-based estimate so every polygon still
// colours.
export const ANNUAL_MEAN_TEMP_C: Record<string, number> = {
  // Africa
  DZ: 22.5, AO: 21.5, EG: 22.1, ET: 22.2, GH: 27.2, KE: 24.7, LY: 21.8,
  MA: 17.1, NG: 26.8, ZA: 17.8, TZ: 22.3, SD: 26.9, SN: 28.0, ML: 28.3,
  TD: 26.6, NE: 27.6, SO: 27.0, CM: 24.6, CI: 26.3, CD: 24.0, MG: 22.7,
  MZ: 24.1, ZM: 21.4, ZW: 21.0, UG: 22.8, RW: 17.9, BW: 21.5, NA: 20.6,
  TN: 19.8, LR: 25.3, SL: 26.1, GN: 25.7, BF: 28.2, BJ: 27.5, TG: 27.2,
  GA: 25.0, CG: 24.6, CF: 24.9, GM: 27.5, GW: 26.7, GQ: 24.5, ER: 25.7,
  DJ: 28.0, SS: 27.5, MR: 27.6, MW: 21.9, LS: 11.9, SZ: 17.5, BI: 19.8,

  // Asia & Middle East
  CN: 7.0, IN: 24.0, JP: 11.2, KR: 11.5, KP: 5.6, ID: 25.9, PK: 20.2,
  BD: 25.0, VN: 24.5, TH: 26.3, MM: 22.4, MY: 25.4, PH: 25.9, SA: 25.0,
  IR: 17.3, IQ: 21.4, TR: 11.1, AF: 12.6, KZ: 6.4, UZ: 12.0, TM: 15.9,
  KG: 1.6, TJ: 2.0, MN: -0.7, NP: 12.0, LK: 27.0, KH: 26.8, LA: 22.8,
  YE: 23.9, OM: 27.0, AE: 28.0, QA: 27.2, KW: 25.7, JO: 18.3, LB: 16.5,
  SY: 17.8, IL: 19.2, PS: 19.0, GE: 5.8, AM: 7.2, AZ: 11.9, BT: 7.4,
  BN: 26.8, TL: 24.5,

  // Europe
  RU: -5.1, DE: 8.5, FR: 10.7, GB: 8.5, IT: 13.2, ES: 13.3, PT: 15.2,
  PL: 7.8, UA: 8.3, RO: 8.8, NL: 9.3, BE: 9.6, GR: 15.4, SE: 2.1, NO: 1.5,
  FI: 1.7, DK: 7.5, IE: 9.3, AT: 6.4, CH: 5.5, CZ: 7.5, HU: 9.7, BG: 10.6,
  RS: 10.6, HR: 10.9, SK: 6.8, SI: 8.9, LT: 6.2, LV: 5.6, EE: 5.1, BY: 6.2,
  MD: 9.5, AL: 11.4, MK: 9.8, BA: 9.7, ME: 9.0, IS: 1.4, LU: 8.6, XK: 9.5,

  // Americas
  US: 8.6, CA: -3.5, MX: 21.0, BR: 24.9, AR: 14.8, CO: 24.5, PE: 19.6,
  VE: 25.4, CL: 8.5, EC: 21.8, BO: 21.5, PY: 23.7, UY: 17.5, GY: 26.0,
  SR: 26.0, GT: 23.3, CU: 25.2, HT: 25.0, DO: 24.5, HN: 23.0, NI: 25.0,
  CR: 24.8, PA: 25.4, SV: 24.5, BZ: 25.3, JM: 25.0, BS: 25.0, TT: 26.0,
  PR: 25.0, GL: -19.0, FK: 5.5,

  // Oceania
  AU: 21.6, NZ: 10.6, PG: 25.0, FJ: 25.0, SB: 26.5, VU: 24.5,
};

/**
 * Annual mean temperature for a country in °C. Uses the curated table when
 * available; otherwise estimates from latitude so unlisted territories still
 * get a plausible colour.
 */
export function estimateAnnualTemp(props: CountryProperties): number {
  const known = ANNUAL_MEAN_TEMP_C[props.iso2];
  if (known !== undefined) return known;
  // Rough climatological fallback: ~27°C at the equator falling toward the poles.
  return 27 - 0.42 * Math.abs(props.lat);
}
