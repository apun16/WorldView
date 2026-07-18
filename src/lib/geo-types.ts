export type CountryProperties = {
  name: string;
  iso2: string;
  continent: string;
  capital: string;
  languages: string[];
  lat: number;
  lng: number;
};

export type CountryFeature = {
  type: "Feature";
  properties: CountryProperties;
  geometry: GeoJSON.Geometry;
};

export type CountryCollection = {
  type: "FeatureCollection";
  features: CountryFeature[];
};

export type SemanticConnection = {
  fromIso2: string;
  toIso2: string;
  label: string;
};

// A curated set of real cultural/historical threads, foreshadowing the
// "semantic globe" — every country pair here is a genuine connection, not a
// random pairing.
export const SEMANTIC_CONNECTIONS: SemanticConnection[] = [
  { fromIso2: "MA", toIso2: "IN", label: "Moroccan spice routes carried cumin and saffron along trade roads into South Asian cooking" },
  { fromIso2: "NG", toIso2: "BR", label: "West African Yoruba traditions crossed the Atlantic and shaped Bahia's music and religion" },
  { fromIso2: "CN", toIso2: "IT", label: "The Silk Road linked Chinese trade goods to Venetian merchants for over a thousand years" },
  { fromIso2: "ES", toIso2: "MX", label: "Spanish colonization left its language as Mexico's most widely spoken tongue" },
  { fromIso2: "TR", toIso2: "DE", label: "Guest-worker migration in the 1960s built Germany's largest Turkish diaspora community" },
  { fromIso2: "FR", toIso2: "SN", label: "French colonial rule left French as Senegal's official language alongside Wolof" },
  { fromIso2: "GB", toIso2: "IN", label: "British colonial administration left English as one of India's official languages" },
  { fromIso2: "PT", toIso2: "AO", label: "Portuguese trade and colonization connected Lisbon to Angola for five centuries" },
  { fromIso2: "JP", toIso2: "BR", label: "Japanese emigration in the early 1900s built the largest Japanese community outside Japan" },
  { fromIso2: "EG", toIso2: "GR", label: "Ancient trade across the Mediterranean linked Egyptian and Greek civilizations" },
];
