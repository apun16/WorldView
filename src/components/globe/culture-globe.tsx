"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import type { CountryCollection, CountryFeature, SemanticConnection } from "@/lib/geo-types";
import CulturePanel from "@/components/globe/culture-panel";
import ConnectionTicker from "@/components/globe/connection-ticker";
import ConnectionsPanel from "@/components/globe/connections-panel";
import { ACTIVE_PALETTE, heatColorFor } from "@/lib/globe-palettes";
import CountrySearch from "@/components/globe/country-search";
import { ALLIANCES } from "@/lib/alliances";
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
  const [connections, setConnections] = useState<SemanticConnection[]>([]);
  const [showLanguageThreads, setShowLanguageThreads] = useState(false);
  const [activeAlliances, setActiveAlliances] = useState<Set<string>>(new Set());
  const palette = ACTIVE_PALETTE;

  const toggleAlliance = useCallback((id: string) => {
    setActiveAlliances((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const panelOpen = panel.kind !== "idle";

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
      // Data views (climate, language diversity) colour each country by its
      // metric; the plain earth palette uses one flat base.
      if (palette.heatmap) {
        return heatColorFor(palette.heatmap, f.properties);
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
        isSelected,
        agent.gender,
        agent.sizeScale
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

  type ArcDatum = {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    label: string;
    fromName: string;
    toName: string;
    kind: "semantic" | "language" | "alliance";
    color?: string;
  };

  const semanticArcs = useMemo<ArcDatum[]>(() => {
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
          kind: "semantic" as const,
        };
      })
      .filter(Boolean) as ArcDatum[];
  }, [countries, connections]);

  // Hub-and-spoke threads: countries sharing a language all connect to the
  // first country listing that language.
  const languageArcs = useMemo<ArcDatum[]>(() => {
    if (!showLanguageThreads || countries.length === 0) return [];
    const byLanguage = new Map<string, CountryFeature[]>();
    for (const c of countries) {
      for (const lang of c.properties.languages) {
        const group = byLanguage.get(lang);
        if (group) group.push(c);
        else byLanguage.set(lang, [c]);
      }
    }
    const arcs: ArcDatum[] = [];
    for (const [language, group] of byLanguage) {
      if (group.length < 2) continue;
      const [hub, ...spokes] = group;
      for (const spoke of spokes) {
        arcs.push({
          startLat: hub.properties.lat,
          startLng: hub.properties.lng,
          endLat: spoke.properties.lat,
          endLng: spoke.properties.lng,
          label: language,
          fromName: hub.properties.name,
          toName: spoke.properties.name,
          kind: "language",
        });
      }
    }
    return arcs;
  }, [countries, showLanguageThreads]);

  // Hub-and-spoke threads for each checked alliance: members connect to the
  // alliance's first listed (host) country.
  const allianceArcs = useMemo<ArcDatum[]>(() => {
    if (activeAlliances.size === 0 || countries.length === 0) return [];
    const byIso2 = new Map(countries.map((c) => [c.properties.iso2, c]));
    const arcs: ArcDatum[] = [];
    for (const alliance of ALLIANCES) {
      if (!activeAlliances.has(alliance.id)) continue;
      const members = alliance.members
        .map((iso2) => byIso2.get(iso2))
        .filter(Boolean) as CountryFeature[];
      if (members.length < 2) continue;
      const [hub, ...spokes] = members;
      for (const spoke of spokes) {
        arcs.push({
          startLat: hub.properties.lat,
          startLng: hub.properties.lng,
          endLat: spoke.properties.lat,
          endLng: spoke.properties.lng,
          label: alliance.name,
          fromName: hub.properties.name,
          toName: spoke.properties.name,
          kind: "alliance",
          color: alliance.color,
        });
      }
    }
    return arcs;
  }, [countries, activeAlliances]);

  const arcsData = useMemo(
    () => [...semanticArcs, ...languageArcs, ...allianceArcs],
    [semanticArcs, languageArcs, allianceArcs]
  );

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
          return `<div style="font-family: var(--font-karla), sans-serif; font-size: 12.5px; padding: 5px 10px; background: rgba(21,14,30,0.92); border: 1px solid rgba(245,185,113,0.35); border-radius: 8px; color: #fdeeda;">${f.properties.name}</div>`;
        }}
        onPolygonHover={(feat) => setHovered((feat as CountryFeature) ?? null)}
        onPolygonClick={handleCountryClick}
        arcsData={arcsData}
        arcColor={(d: object) => {
          const a = d as ArcDatum;
          if (a.kind === "alliance") return [a.color ?? "#fff", a.color ?? "#fff"];
          if (a.kind === "language")
            return ["rgba(226,232,240,0.55)", "rgba(226,232,240,0.55)"];
          return ["rgba(249,115,22,0.95)", "rgba(249,115,22,0.15)"];
        }}
        arcDashLength={(d: object) => ((d as ArcDatum).kind === "semantic" ? 0.4 : 1)}
        arcDashGap={(d: object) => ((d as ArcDatum).kind === "semantic" ? 2 : 0)}
        arcDashInitialGap={(d: object) =>
          (d as ArcDatum).kind === "semantic" ? Math.random() * 3 : 0
        }
        arcDashAnimateTime={(d: object) => ((d as ArcDatum).kind === "semantic" ? 4000 : 0)}
        arcStroke={(d: object) => ((d as ArcDatum).kind === "semantic" ? 0.6 : 0.35)}
        arcAltitudeAutoScale={0.35}
        objectsData={agentsData}
        objectLat={(d: object) => (d as AgentMarker).lat}
        objectLng={(d: object) => (d as AgentMarker).lng}
        objectAltitude={(d: object) => (d as AgentMarker).altitude}
        objectThreeObject={renderAgentMarker}
        onObjectClick={(d: object) => handleAgentSelect(d as AgentMarker)}
        onObjectHover={(d: object | null) => setHoveredAgent((d as AgentMarker) ?? null)}
        objectLabel={(d: object) => {
          const a = d as AgentMarker;
          if (a.id === selectedAgent?.id) {
            return `<div style="font-family: var(--font-karla), sans-serif; font-size: 12.5px; padding: 5px 10px; background: rgba(21,14,30,0.92); border: 1px solid rgba(245,185,113,0.35); border-radius: 8px; color: #fdeeda;">${a.name}</div>`;
          }
          return "";
        }}
        arcLabel={(d: object) => {
          const a = d as { fromName: string; toName: string; label: string };
          return `<div style="max-width:220px; font-family: var(--font-karla), sans-serif; font-size: 11.5px; line-height:1.45; padding: 7px 10px; background: rgba(21,14,30,0.93); border: 1px solid rgba(233,196,106,0.35); border-radius: 10px; color: #e9c46a;">${a.fromName} → ${a.toName}<br/><span style="color:#fdeeda;">${a.label}</span></div>`;
        }}
      />

      <ConnectionTicker connections={semanticArcs} />

      {panel.kind === "idle" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CountrySearch countries={countries} onSelect={handleCountryClick} shifted={panelOpen} />
        </div>
      )}

      <ConnectionsPanel
        alliances={ALLIANCES}
        activeAlliances={activeAlliances}
        onToggleAlliance={toggleAlliance}
        showLanguageThreads={showLanguageThreads}
        onToggleLanguageThreads={() => setShowLanguageThreads((v) => !v)}
      />

      <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 flex-col items-center">
        <PaletteSlider
          palettes={GLOBE_PALETTES}
          index={paletteIndex}
          onChange={setPaletteIndex}
        />

        {palette.heatmap && (
          <div className="pointer-events-none flex items-center gap-2 rounded-full border border-white/10 bg-[#070a14]/80 px-3 py-1.5 backdrop-blur-md">
            <span className="font-mono text-[9px] text-zinc-400">
              {palette.heatmap.legend.low}
            </span>
            <span
              className="h-1.5 w-28 rounded-full"
              style={{
                background: `linear-gradient(to right, ${scaleToGradient(palette.heatmap.scale)})`,
              }}
            />
            <span className="font-mono text-[9px] text-zinc-400">
              {palette.heatmap.legend.high}
            </span>
          </div>
        )}
      </div>

      <CountrySearch
        countries={countries}
        onSelect={handleCountryClick}
        shifted={panelOpen}
      />
>>>>>>> origin/main

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
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 font-serif text-sm italic tracking-wide text-cream/45">
          tap a country to meet someone there · drag to wander
        </div>
      )}
    </div>
  );
}
