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
import {
  getCountryAgentMarkers,
  getCountryAgents,
  type Agent,
  type AgentMarker,
} from "@/lib/agents";
import {
  AGENT_HOVER_COLOR,
  createAgentMarker,
  setAgentMarkerColor,
} from "@/components/globe/agent-marker";

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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
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

  // Markers sit above the polygons, so pointing at one makes onPolygonHover
  // report null. Falling back to the hovered marker's own country keeps that
  // country "hovered" — otherwise its highlight and markers would drop,
  // re-expose the polygon, and flicker in a loop.
  const hoveredCountry = useMemo(() => {
    if (hovered) return hovered;
    if (!hoveredAgent) return null;
    return countries.find((c) => c.properties.iso2 === hoveredAgent.iso2) ?? null;
  }, [hovered, hoveredAgent, countries]);

  const capColor = useCallback(
    (feat: object) => {
      const f = feat as CountryFeature;
      if (hoveredCountry && f.properties.iso2 === hoveredCountry.properties.iso2) {
        return palette.hover;
      }
      if (f.properties.iso2 === selectedIso2) return palette.selected;
      if (activeLanguage && f.properties.languages.includes(activeLanguage)) {
        return palette.languageMatch;
      }
      if (activeContinent && f.properties.continent === activeContinent) {
        return palette.continentGlow;
      }
      return palette.base;
    },
    [hoveredCountry, selectedIso2, activeLanguage, activeContinent, palette]
  );

  const altitude = useCallback(
    (feat: object) => {
      const f = feat as CountryFeature;
      if (hoveredCountry && f.properties.iso2 === hoveredCountry.properties.iso2) {
        return 0.06;
      }
      if (f.properties.iso2 === selectedIso2) return 0.05;
      if (activeLanguage && f.properties.languages.includes(activeLanguage)) return 0.04;
      return 0.01;
    },
    [hoveredCountry, selectedIso2, activeLanguage]
  );

  const flyTo = useCallback((lat: number, lng: number, altitude = 1.4) => {
    globeRef.current?.pointOfView({ lat, lng, altitude }, 1400);
  }, []);

  /**
   * Opens a country. `agent` is the guide the user picked explicitly; without
   * one, the country's first guide is selected so the panel always has someone
   * to walk with. An existing selection in the same country is kept.
   */
  const selectCountry = useCallback(
    (country: CountryFeature, agent?: Agent) => {
      setPanel({ kind: "country", country });
      setSelectedAgent((current) => {
        if (agent) return agent;
        if (current && current.iso2 === country.properties.iso2) return current;
        return getCountryAgents(country)[0] ?? null;
      });
      flyTo(country.properties.lat, country.properties.lng, 1.3);
    },
    [flyTo]
  );

  const handleCountryClick = useCallback(
    (feat: object) => selectCountry(feat as CountryFeature),
    [selectCountry]
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
    setSelectedAgent(null);
    globeRef.current?.pointOfView({ altitude: 2.2 }, 1200);
  }, []);

  // Guides show on the country under the cursor and on the selected one, so
  // the globe stays readable instead of carrying 500+ markers at once. Each
  // one rides just above its country's extruded cap so the raised polygon
  // does not swallow it.
  const agentsData = useMemo((): AgentMarker[] => {
    const active: CountryFeature[] = [];
    if (panel.kind === "country") active.push(panel.country);
    if (hoveredCountry && hoveredCountry.properties.iso2 !== selectedIso2) {
      active.push(hoveredCountry);
    }
    return active.flatMap((country) =>
      getCountryAgentMarkers(country, altitude(country) + 0.004)
    );
  }, [panel, hoveredCountry, selectedIso2, altitude]);

  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      // Already looking at this country: just switch guide, no camera move.
      if (panel.kind === "country" && panel.country.properties.iso2 === agent.iso2) {
        setSelectedAgent(agent);
        return;
      }
      const country = countries.find((c) => c.properties.iso2 === agent.iso2);
      if (country) selectCountry(country, agent);
    },
    [panel, countries, selectCountry]
  );

  const panelAgents = useMemo(
    () => (panel.kind === "country" ? getCountryAgents(panel.country) : []),
    [panel]
  );

  const agentColor = useCallback(
    (agentId: string) => {
      if (selectedAgent?.id === agentId) return palette.selected;
      if (hoveredAgent?.id === agentId) return AGENT_HOVER_COLOR;
      return palette.hover;
    },
    [selectedAgent, hoveredAgent, palette]
  );

  const renderAgentMarker = useCallback(
    (d: object) => {
      const agent = d as AgentMarker;
      const isSelected = selectedAgent?.id === agent.id;
      // Colour is corrected by the effect below; only size depends on
      // selection, so hovering never has to rebuild the mesh.
      return createAgentMarker(
        agent.id,
        isSelected ? palette.selected : palette.hover,
        isSelected
      );
    },
    [palette, selectedAgent]
  );

  // Recolour markers in place on hover/selection.
  useEffect(() => {
    for (const agent of agentsData) {
      setAgentMarkerColor(agent.id, agentColor(agent.id));
    }
  }, [agentsData, agentColor]);

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
        objectsData={agentsData}
        objectLat={(d: object) => (d as AgentMarker).lat}
        objectLng={(d: object) => (d as AgentMarker).lng}
        objectAltitude={(d: object) => (d as AgentMarker).altitude}
        objectThreeObject={renderAgentMarker}
        onObjectClick={(d: object) => handleAgentSelect(d as AgentMarker)}
        onObjectHover={(d: object | null) => setHoveredAgent((d as AgentMarker) ?? null)}
        objectLabel={() => ""}
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
        agents={panelAgents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleAgentSelect}
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
