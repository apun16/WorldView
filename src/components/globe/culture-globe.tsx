"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import type { CountryCollection, CountryFeature, SemanticConnection } from "@/lib/geo-types";
import CulturePanel from "@/components/globe/culture-panel";
import ConnectionTicker from "@/components/globe/connection-ticker";
import { GLOBE_PALETTES } from "@/lib/globe-palettes";
import PaletteSlider from "@/components/globe/palette-slider";
import CountrySearch from "@/components/globe/country-search";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export type PanelView =
  | { kind: "idle" }
  | { kind: "country"; country: CountryFeature }
  | { kind: "continent"; continent: string }
  | {
      kind: "language";
      continent: string;
      language: string;
      countries: CountryFeature[];
    };

export default function CultureGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 800 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hovered, setHovered] = useState<CountryFeature | null>(null);
  const [panel, setPanel] = useState<PanelView>({ kind: "idle" });
  const [paletteIndex, setPaletteIndex] = useState(2);
  const [connections, setConnections] = useState<SemanticConnection[]>([]);
  const palette = GLOBE_PALETTES[paletteIndex];

  useEffect(() => {
    fetch("/data/countries-enriched.geojson")
      .then((res) => res.json())
      .then((data: CountryCollection) => setCountries(data.features));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/semantic-connections")
      .then((res) => res.json())
      .then((data: { connections?: SemanticConnection[] }) => {
        if (!cancelled && Array.isArray(data.connections)) {
          setConnections(data.connections);
        }
      })
      .catch(() => {
        if (!cancelled) setConnections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleGlobeReady = useCallback(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
    }
    globeRef.current?.pointOfView({ altitude: 2.2 }, 0);
  }, []);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = panel.kind === "idle";
  }, [panel]);

  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(palette.globeColor),
      emissive: new THREE.Color(palette.globeEmissive),
      shininess: 4,
    });
  }, [palette]);

  const selectedIso2 =
    panel.kind === "country" ? panel.country.properties.iso2 : null;
  const activeLanguage = panel.kind === "language" ? panel.language : null;
  const activeContinent =
    panel.kind === "continent" || panel.kind === "language" ? panel.continent : null;

  const capColor = useCallback(
    (feat: object) => {
      const f = feat as CountryFeature;
      if (hovered && f.properties.iso2 === hovered.properties.iso2) return palette.hover;
      if (f.properties.iso2 === selectedIso2) return palette.selected;
      if (activeLanguage && f.properties.languages.includes(activeLanguage)) {
        return palette.languageMatch;
      }
      if (activeContinent && f.properties.continent === activeContinent) {
        return palette.continentGlow;
      }
      return palette.base;
    },
    [hovered, selectedIso2, activeLanguage, activeContinent, palette]
  );

  const altitude = useCallback(
    (feat: object) => {
      const f = feat as CountryFeature;
      if (hovered && f.properties.iso2 === hovered.properties.iso2) return 0.06;
      if (f.properties.iso2 === selectedIso2) return 0.05;
      if (activeLanguage && f.properties.languages.includes(activeLanguage)) return 0.04;
      return 0.01;
    },
    [hovered, selectedIso2, activeLanguage]
  );

  const flyTo = useCallback((lat: number, lng: number, altitude = 1.4) => {
    globeRef.current?.pointOfView({ lat, lng, altitude }, 1400);
  }, []);

  const handleCountryClick = useCallback(
    (feat: object) => {
      const country = feat as CountryFeature;
      setPanel({ kind: "country", country });
      flyTo(country.properties.lat, country.properties.lng, 1.3);
    },
    [flyTo]
  );

  const openContinentLanguages = useCallback((continent: string) => {
    setPanel({ kind: "continent", continent });
  }, []);

  const openLanguage = useCallback(
    (continent: string, language: string) => {
      const matches = countries.filter(
        (c) => c.properties.continent === continent && c.properties.languages.includes(language)
      );
      setPanel({ kind: "language", continent, language, countries: matches });
    },
    [countries]
  );

  const backToIdle = useCallback(() => {
    setPanel({ kind: "idle" });
    globeRef.current?.pointOfView({ altitude: 2.2 }, 1200);
  }, []);

  const arcsData = useMemo(() => {
    if (countries.length === 0 || connections.length === 0) return [];
    const byIso2 = new Map(countries.map((c) => [c.properties.iso2, c]));
    return connections
      .map((conn) => {
        const from = byIso2.get(conn.fromIso2);
        const to = byIso2.get(conn.toIso2);
        if (!from || !to) return null;
        return {
          startLat: from.properties.lat,
          startLng: from.properties.lng,
          endLat: to.properties.lat,
          endLng: to.properties.lng,
          label: conn.label,
          fromName: from.properties.name,
          toName: to.properties.name,
        };
      })
      .filter(Boolean) as Array<{
        startLat: number;
        startLng: number;
        endLat: number;
        endLng: number;
        label: string;
        fromName: string;
        toName: string;
      }>;
  }, [countries, connections]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Globe
        ref={globeRef}
        width={dims.width}
        height={dims.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor={palette.atmosphere}
        atmosphereAltitude={0.18}
        onGlobeReady={handleGlobeReady}
        polygonsData={countries}
        polygonCapColor={capColor}
        polygonSideColor={() => palette.side}
        polygonStrokeColor={() => palette.stroke}
        polygonAltitude={altitude}
        polygonsTransitionDuration={250}
        polygonLabel={(feat: object) => {
          const f = feat as CountryFeature;
          return `<div style="font-family: ui-monospace, monospace; font-size: 12px; padding: 4px 8px; background: rgba(5,7,13,0.9); border: 1px solid rgba(125,211,252,0.3); border-radius: 4px; color: #e0f2fe;">${f.properties.name}</div>`;
        }}
        onPolygonHover={(feat) => setHovered((feat as CountryFeature) ?? null)}
        onPolygonClick={handleCountryClick}
        arcsData={arcsData}
        arcColor={() => ["rgba(251,191,36,0.9)", "rgba(251,191,36,0.15)"]}
        arcDashLength={0.4}
        arcDashGap={2}
        arcDashInitialGap={() => Math.random() * 3}
        arcDashAnimateTime={4000}
        arcStroke={0.6}
        arcAltitudeAutoScale={0.35}
        arcLabel={(d: object) => {
          const a = d as { fromName: string; toName: string; label: string };
          return `<div style="max-width:220px; font-family: ui-monospace, monospace; font-size: 11px; line-height:1.4; padding: 6px 9px; background: rgba(5,7,13,0.92); border: 1px solid rgba(251,191,36,0.35); border-radius: 6px; color: #fde68a;">${a.fromName} → ${a.toName}<br/><span style="color:#fef3c7;">${a.label}</span></div>`;
        }}
      />

      <ConnectionTicker connections={arcsData} />

      <PaletteSlider
        palettes={GLOBE_PALETTES}
        index={paletteIndex}
        onChange={setPaletteIndex}
      />

      <CountrySearch countries={countries} onSelect={handleCountryClick} />

      <CulturePanel
        panel={panel}
        countries={countries}
        onSelectContinent={openContinentLanguages}
        onSelectLanguage={openLanguage}
        onSelectCountryFromList={handleCountryClick}
        onClose={backToIdle}
      />

      {panel.kind === "idle" && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest text-zinc-500">
          click a country to begin · drag to explore
        </div>
      )}
    </div>
  );
}
