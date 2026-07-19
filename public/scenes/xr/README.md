# Walk photospheres

**2:1 equirectangular JPEGs.** Resolution is driven by where the journey
actually is. The walk tries these in order, first hit wins:

```
{iso2}/{destination}.jpg              this country specifically
_climate/{zone}/nature.jpg            nature: by climate
_subregion/{subregion}/{dest}.jpg     built environment: by UN subregion
_region/{region}/{dest}.jpg           built environment: by continent
_default/{destination}.jpg            last-resort generic
                                      procedural sky (built in)
```

The middle two swap priority by destination, because what makes a place look
like itself differs. A forest is set by **climate** — a rainforest is a
rainforest whether it is in Brazil or Sri Lanka. A market is set by **culture**, so it
tries UN subregion before continent — "Asia" is far too coarse to hold both
Colombo and Shanghai, and lumping them is exactly how a Sri Lankan street ends
up rendered as a Chinese one.

Subregions come from the `world-countries` package (22 in use, e.g.
`southern-asia`, `western-africa`), joined into `src/lib/country-index.ts`.

Resolution logic lives in `src/lib/walk/scene-locale.ts`.

## Climate zones

Derived from `|latitude|`, with an explicit arid override — latitude alone
cannot separate the Sahara from Malaysian rainforest, since they sit in the same
band.

| Zone | Rule | Countries |
|---|---|---|
| `arid` | explicit ISO2 list | 35 |
| `tropical` | \|lat\| < 23.5° | 72 |
| `temperate` | \|lat\| < 50° | 50 |
| `continental` | \|lat\| < 63° | 16 |
| `polar` | \|lat\| ≥ 63° | 4 |

## Regions

From `continent`: `africa` (51), `asia` (47), `europe` (41), `americas` (31),
`oceania` (7).

## Current contents

Licences and credits are in `ATTRIBUTION.md` — check it before adding images.

| Path | Source | Serves |
|---|---|---|
| `_climate/tropical/nature.jpg` | Poly Haven `rainforest_trail` | 72 countries |
| `_climate/temperate/nature.jpg` | Poly Haven `phalzer_forest_01` | 50 |
| `_climate/arid/nature.jpg` | Poly Haven `goegap` | 35 |
| `_climate/continental/nature.jpg` | Poly Haven `misty_pines` | 16 |
| `_climate/polar/nature.jpg` | Poly Haven `snowy_forest_path_01` | 4 |
| `_subregion/southern-asia/street.jpg` | Commons, Bengaluru | 8 |
| `_subregion/eastern-asia/street.jpg` | Poly Haven `shanghai_riverside` | 6 |
| `_subregion/eastern-asia/home.jpg` | Commons, Fukuoka house | 6 |
| `_default/street.jpg` | Poly Haven `braustuble_alley` | 163 |
| `_default/market.jpg` | Poly Haven `leadenhall_market` | **177** |
| `_default/school.jpg` | Poly Haven `abandoned_hall_01` | **177** |
| `_default/home.jpg` | Poly Haven `kiara_interior` | 171 |

There is no `_default/nature.jpg` — all five climate zones are covered, so it
would never be reached. For the same reason a `_subregion/*/nature.jpg` is dead
weight: climate wins for nature by design.

## What is still wrong

`nature` is fully location-driven. `street` is right for South and East Asia.

**`market` and `school` are the same generic photo for all 177 countries**, and
`home` for 171 of them. A Sri Lankan walk still visits a London market.

This is not an oversight, it is a sourcing wall: no free, licence-clean,
worldwide dataset of 360° *interiors* exists. Poly Haven has one market in 980
panoramas. Wikimedia Commons has no 360s at all for Sri Lanka, Kenya, Morocco,
Peru, Egypt, Thailand or Indonesia. Mapillary covers streets worldwide but is
outdoor-only and needs an API token.

Highest-impact next steps:

1. `_subregion/{western-africa,eastern-africa,south-america,south-eastern-asia}/street.jpg`
   — 4 images covering 52 countries
2. `market` and `school` for those same subregions — needs either commissioned
   photography or generated panoramas; no free photo source covers it
3. Country-specific `{iso2}/` imagery for whichever countries get demoed

## Sizing

Target **4096×2048**, expect **1–3.5MB** at q45–60. Keep the width at 4096: the
loader stays procedural when `renderer.capabilities.maxTextureSize < 4096`, so
narrower assets would make that guard wrong. Never 8K — ~64MB of VRAM decoded,
over the texture limit on many mobile GPUs.

```sh
sips -z 2048 4096 -s format jpeg -s formatOptions 55 in.jpg --out out.jpg
```
