# ACLED conflict ingestion

Turns ACLED regional-aggregate `.xlsx` exports into `public/data/acled-conflicts.json`,
the static file the globe and country panel read.

## Setup

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

Drop your ACLED export(s) into `scripts/data/` (gitignored — they're large
and regeneratable), then:

```
python ingest_acled.py
```

This reads every `.xlsx` in `scripts/data/`, keeps the last 90 days (`--days`
to change), maps each `COUNTRY` to the iso2 code the globe uses, and writes
`public/data/acled-conflicts.json`: per-country event/fatality totals, an
event-type breakdown, a severity tier (`low`/`medium`/`high`), a templated
one-line summary, and the top admin1 "hotspots" by fatalities.

Re-run it whenever you drop a fresh export — it fully replaces the output
file. There's no live API call or database; the frontend just reads whatever
this script last wrote, same as it already does for
`public/data/countries-enriched.geojson`.
