export type Alliance = {
  id: string;
  name: string;
  color: string;
  // ISO2 codes of member countries. First entry is used as the hub the
  // threads radiate from (host of the alliance's headquarters where one
  // exists).
  members: string[];
};

export const ALLIANCES: Alliance[] = [
  {
    id: "nato",
    name: "NATO",
    color: "#38bdf8",
    members: [
      "BE", "US", "CA", "GB", "FR", "DE", "IT", "ES", "PT", "NL", "LU",
      "DK", "NO", "IS", "TR", "GR", "PL", "CZ", "HU", "SK", "SI", "BG",
      "RO", "HR", "AL", "ME", "MK", "EE", "LV", "LT", "FI", "SE",
    ],
  },
  {
    id: "eu",
    name: "European Union",
    color: "#facc15",
    members: [
      "BE", "AT", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
      "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
      "RO", "SK", "SI", "ES", "SE",
    ],
  },
  {
    id: "asean",
    name: "ASEAN",
    color: "#4ade80",
    members: ["ID", "BN", "KH", "LA", "MY", "MM", "PH", "SG", "TH", "VN"],
  },
  {
    id: "brics",
    name: "BRICS",
    color: "#f472b6",
    members: ["BR", "RU", "IN", "CN", "ZA"],
  },
];
