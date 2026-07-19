#!/usr/bin/env python3
"""Ingest ACLED regional-aggregate .xlsx exports, segment them per country,
and write the static JSON the WorldView frontend reads.

ACLED's regional aggregate files (one per region, e.g.
"Middle-East_aggregated_data_up_to_week_of-2026-07-04.xlsx") are pre-summed
by WEEK / COUNTRY / ADMIN1 / EVENT_TYPE — there are no individual event rows
with notes or exact dates, so "segmentation" here means re-aggregating those
weekly counts into a per-country rollup over a recent window, with the
heaviest-hit admin1 regions as "hotspots" standing in for top events.

Usage:
    python ingest_acled.py                       # reads every .xlsx in scripts/data/
    python ingest_acled.py --days 60
    python ingest_acled.py path/to/one-export.xlsx path/to/another.xlsx

Re-run this whenever you drop fresh exports into scripts/data/ — it fully
replaces the output file. There is no live API call: the frontend just reads
whatever JSON this script last wrote (public/data/acled-conflicts.json), the
same way it already reads public/data/countries-enriched.geojson.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import pycountry

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_DATA_DIR = SCRIPT_DIR.parent / "data"
DEFAULT_OUT = REPO_ROOT / "public" / "data" / "acled-conflicts.json"
COUNTRIES_GEOJSON = REPO_ROOT / "public" / "data" / "countries-enriched.geojson"

# ACLED's country names occasionally disagree with pycountry's official
# names closely enough that fuzzy search still finds them, but a few are
# worth pinning down explicitly rather than trusting fuzzy matching.
COUNTRY_NAME_OVERRIDES = {
    "ivory coast": "CI",
    "democratic republic of congo": "CD",
    "republic of congo": "CG",
    "swaziland": "SZ",
    "eswatini": "SZ",
    "cape verde": "CV",
    "united states": "US",
    "united states of america": "US",
    "russia": "RU",
    "south korea": "KR",
    "north korea": "KP",
    "laos": "LA",
    "vietnam": "VN",
    "syria": "SY",
    "brunei": "BN",
    "moldova": "MD",
    "bolivia": "BO",
    "venezuela": "VE",
    "iran": "IR",
    "tanzania": "TZ",
    "czech republic": "CZ",
    "myanmar": "MM",
    "palestine": "PS",
    "turkey": "TR",
    "turkiye": "TR",
    "east timor": "TL",
    "timor-leste": "TL",
    "cape verde islands": "CV",
    "micronesia": "FM",
    "cocos islands": "CC",
}

SEVERITY_THRESHOLDS = [
    # (min fatalities in window, label) — highest match wins.
    (100, "high"),
    (10, "medium"),
    (0, "low"),
]

REQUIRED_COLUMNS = {"week", "country", "event_type", "events", "fatalities"}

_iso2_cache: dict[str, str | None] = {}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def clean_str(val) -> str | None:
    """Coerce a pandas cell to a trimmed string, or None for NaN/empty."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    text = str(val).strip()
    return text or None


def iso2_from_country_name(country_name: str) -> str | None:
    if country_name in _iso2_cache:
        return _iso2_cache[country_name]

    key = country_name.strip().lower()
    result = None
    if key in COUNTRY_NAME_OVERRIDES:
        result = COUNTRY_NAME_OVERRIDES[key]
    else:
        try:
            matches = pycountry.countries.search_fuzzy(country_name)
            if matches:
                result = matches[0].alpha_2
        except LookupError:
            result = None

    _iso2_cache[country_name] = result
    return result


def severity_for(fatalities: int) -> str:
    for threshold, label in SEVERITY_THRESHOLDS:
        if fatalities >= threshold:
            return label
    return "low"


def build_summary(
    event_count: int, fatalities: int, days: int, event_types: Counter, top_location: str | None
) -> str:
    top_type = event_types.most_common(1)[0][0].lower() if event_types else "unrest"
    events_word = "event" if event_count == 1 else "events"
    fatalities_word = "fatality" if fatalities == 1 else "fatalities"
    location_phrase = f" near {top_location}" if top_location else ""
    return (
        f"{event_count} conflict {events_word} in the last {days} days "
        f"({fatalities} {fatalities_word}): mostly {top_type}{location_phrase}."
    )


def load_valid_iso2(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text())
    return {f["properties"]["iso2"] for f in data.get("features", [])}


def resolve_inputs(paths: list[Path], data_dir: Path) -> list[Path]:
    if paths:
        return paths
    files = sorted(data_dir.glob("*.xlsx"))
    if not files:
        print(f"error: no .xlsx files found in {data_dir}", file=sys.stderr)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "xlsx_paths", type=Path, nargs="*", help="Specific ACLED .xlsx export(s). Defaults to every file in --data-dir."
    )
    parser.add_argument(
        "--data-dir", type=Path, default=DEFAULT_DATA_DIR, help=f"Folder to glob *.xlsx from (default: {DEFAULT_DATA_DIR})"
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"Output JSON path (default: {DEFAULT_OUT})")
    parser.add_argument(
        "--days", type=int, default=90, help="Rolling window size in days, ending at the latest week in the data (default: 90)"
    )
    parser.add_argument(
        "--top-hotspots", type=int, default=5, help="How many top admin1 hotspots to keep per country (default: 5)"
    )
    args = parser.parse_args()

    inputs = resolve_inputs(args.xlsx_paths, args.data_dir)
    if not inputs:
        return 1

    frames = []
    for path in inputs:
        print(f"reading {path.name}…")
        frames.append(normalize_columns(pd.read_excel(path)))
    df = pd.concat(frames, ignore_index=True)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        print(
            f"error: export is missing expected columns {sorted(missing)}. "
            f"Found columns: {sorted(df.columns)}",
            file=sys.stderr,
        )
        return 1

    df["week"] = pd.to_datetime(df["week"], errors="coerce")
    df = df.dropna(subset=["week"])
    df["events"] = pd.to_numeric(df["events"], errors="coerce").fillna(0).astype(int)
    df["fatalities"] = pd.to_numeric(df["fatalities"], errors="coerce").fillna(0).astype(int)

    as_of = df["week"].max()
    window_start = as_of - timedelta(days=args.days)
    windowed = df[df["week"] >= window_start].copy()
    print(
        f"as-of week: {as_of.date()} — {len(windowed)} of {len(df)} weekly rows fall in the last {args.days} days "
        f"({int(windowed['events'].sum())} events, {int(windowed['fatalities'].sum())} fatalities)"
    )

    windowed["iso2"] = windowed["country"].map(iso2_from_country_name)

    unmapped = sorted(set(windowed.loc[windowed["iso2"].isna(), "country"].unique()))
    if unmapped:
        print(f"warning: could not map {len(unmapped)} country name(s) to iso2, skipping: {unmapped}", file=sys.stderr)
    windowed = windowed.dropna(subset=["iso2"])

    valid_iso2 = load_valid_iso2(COUNTRIES_GEOJSON)
    if valid_iso2:
        outside = sorted(set(windowed["iso2"].unique()) - valid_iso2)
        if outside:
            print(
                f"note: {len(outside)} mapped iso2 code(s) aren't in the app's country list, skipping: {outside}",
                file=sys.stderr,
            )
        windowed = windowed[windowed["iso2"].isin(valid_iso2)]

    has_admin1 = "admin1" in windowed.columns
    has_centroid = {"centroid_latitude", "centroid_longitude"}.issubset(windowed.columns)

    countries: dict[str, dict] = {}
    for iso2, group in windowed.groupby("iso2"):
        total_events = int(group["events"].sum())
        total_fatalities = int(group["fatalities"].sum())
        event_types = Counter()
        for _, row in group.iterrows():
            event_types[clean_str(row.get("event_type")) or "Unknown"] += int(row["events"])

        hotspots = []
        top_location = None
        if has_admin1:
            by_admin1 = (
                group.groupby("admin1")
                .agg(
                    events=("events", "sum"),
                    fatalities=("fatalities", "sum"),
                    lat=("centroid_latitude", "first") if has_centroid else ("events", "first"),
                    lng=("centroid_longitude", "first") if has_centroid else ("events", "first"),
                )
                .reset_index()
                .sort_values(["fatalities", "events"], ascending=[False, False])
            )
            if not by_admin1.empty:
                top_location = clean_str(by_admin1.iloc[0]["admin1"])

            for _, row in by_admin1.head(args.top_hotspots).iterrows():
                admin_group = group[group["admin1"] == row["admin1"]]
                admin_types = Counter()
                for _, r in admin_group.iterrows():
                    admin_types[clean_str(r.get("event_type")) or "Unknown"] += int(r["events"])
                top_type = admin_types.most_common(1)[0][0] if admin_types else None
                hotspots.append(
                    {
                        "location": clean_str(row["admin1"]) or "Unknown",
                        "events": int(row["events"]),
                        "fatalities": int(row["fatalities"]),
                        "topEventType": top_type,
                        "lat": float(row["lat"]) if has_centroid and pd.notna(row["lat"]) else None,
                        "lng": float(row["lng"]) if has_centroid and pd.notna(row["lng"]) else None,
                    }
                )

        countries[iso2] = {
            "iso2": iso2,
            "totalEvents": total_events,
            "totalFatalities": total_fatalities,
            "eventTypeCounts": dict(event_types),
            "severity": severity_for(total_fatalities),
            "summary": build_summary(total_events, total_fatalities, args.days, event_types, top_location),
            "hotspots": hotspots,
        }

    output = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "asOf": as_of.strftime("%Y-%m-%d"),
        "windowDays": args.days,
        "countries": countries,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    ranked = sorted(countries.values(), key=lambda c: c["totalFatalities"], reverse=True)
    print(f"\nwrote {args.out} — {len(countries)} countries with activity in the window")
    print("top 10 by fatalities:")
    for c in ranked[:10]:
        print(f"  {c['iso2']}: {c['totalFatalities']} fatalities, {c['totalEvents']} events ({c['severity']})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
