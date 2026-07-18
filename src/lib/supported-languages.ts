export type SupportedLanguage = {
  code: string;
  name: string;
  /** Extra GeoJSON / display names that map to this language. */
  aliases?: string[];
  /**
   * Famous attraction for this language, shown only when the selected
   * country matches `attractionIso2` (and the language is spoken there).
   */
  attraction?: string;
  attractionIso2?: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "AFR", name: "Afrikaans", attraction: "Table Mountain", attractionIso2: "ZA" },
  { code: "ARA", name: "Arabic", attraction: "Petra", attractionIso2: "JO" },
  { code: "HYE", name: "Armenian", attraction: "Geghard Monastery", attractionIso2: "AM" },
  { code: "ASM", name: "Assamese" },
  { code: "AZE", name: "Azerbaijani", attraction: "Flame Towers", attractionIso2: "AZ" },
  { code: "BEL", name: "Belarusian", attraction: "Mir Castle", attractionIso2: "BY" },
  { code: "BEN", name: "Bengali", attraction: "Sundarbans", attractionIso2: "BD" },
  { code: "BOS", name: "Bosnian", attraction: "Stari Most", attractionIso2: "BA" },
  { code: "BUL", name: "Bulgarian", attraction: "Rila Monastery", attractionIso2: "BG" },
  { code: "CAT", name: "Catalan" },
  { code: "CEB", name: "Cebuano" },
  {
    code: "NYA",
    name: "Chichewa",
    aliases: ["Chewa"],
    attraction: "Lake Malawi",
    attractionIso2: "MW",
  },
  { code: "HRV", name: "Croatian", attraction: "Dubrovnik Old Town", attractionIso2: "HR" },
  { code: "CES", name: "Czech", attraction: "Prague Castle", attractionIso2: "CZ" },
  { code: "DAN", name: "Danish", attraction: "Nyhavn", attractionIso2: "DK" },
  { code: "NLD", name: "Dutch", attraction: "Keukenhof", attractionIso2: "NL" },
  { code: "ENG", name: "English", attraction: "Tower of London", attractionIso2: "GB" },
  { code: "EST", name: "Estonian", attraction: "Tallinn Old Town", attractionIso2: "EE" },
  { code: "FIL", name: "Filipino", attraction: "Rizal Park", attractionIso2: "PH" },
  { code: "FIN", name: "Finnish", attraction: "Suomenlinna", attractionIso2: "FI" },
  { code: "FRA", name: "French", attraction: "Eiffel Tower", attractionIso2: "FR" },
  { code: "GLG", name: "Galician" },
  {
    code: "KAT",
    name: "Georgian",
    attraction: "Gergeti Trinity Church",
    attractionIso2: "GE",
  },
  {
    code: "DEU",
    name: "German",
    attraction: "Neuschwanstein Castle",
    attractionIso2: "DE",
  },
  { code: "ELL", name: "Greek", attraction: "Acropolis of Athens", attractionIso2: "GR" },
  { code: "GUJ", name: "Gujarati" },
  { code: "HAU", name: "Hausa" },
  { code: "HEB", name: "Hebrew", attraction: "Western Wall", attractionIso2: "IL" },
  { code: "HIN", name: "Hindi", attraction: "Taj Mahal", attractionIso2: "IN" },
  {
    code: "HUN",
    name: "Hungarian",
    attraction: "Parliament Building",
    attractionIso2: "HU",
  },
  { code: "ISL", name: "Icelandic", attraction: "Blue Lagoon", attractionIso2: "IS" },
  { code: "IND", name: "Indonesian", attraction: "Borobudur", attractionIso2: "ID" },
  { code: "GLE", name: "Irish", attraction: "Cliffs of Moher", attractionIso2: "IE" },
  { code: "ITA", name: "Italian", attraction: "Colosseum", attractionIso2: "IT" },
  { code: "JPN", name: "Japanese", attraction: "Mount Fuji", attractionIso2: "JP" },
  { code: "JAV", name: "Javanese" },
  { code: "KAN", name: "Kannada" },
  { code: "KAZ", name: "Kazakh", attraction: "Charyn Canyon", attractionIso2: "KZ" },
  {
    code: "KIR",
    name: "Kirghiz",
    aliases: ["Kyrgyz"],
    attraction: "Issyk-Kul",
    attractionIso2: "KG",
  },
  { code: "KOR", name: "Korean", attraction: "Gyeongbokgung", attractionIso2: "KR" },
  { code: "LAV", name: "Latvian", attraction: "Riga Old Town", attractionIso2: "LV" },
  {
    code: "LIN",
    name: "Lingala",
    attraction: "Virunga National Park",
    attractionIso2: "CD",
  },
  {
    code: "LIT",
    name: "Lithuanian",
    attraction: "Trakai Island Castle",
    attractionIso2: "LT",
  },
  { code: "LTZ", name: "Luxembourgish", attraction: "Vianden Castle", attractionIso2: "LU" },
  { code: "MKD", name: "Macedonian", attraction: "Lake Ohrid", attractionIso2: "MK" },
  { code: "MSA", name: "Malay", attraction: "Petronas Twin Towers", attractionIso2: "MY" },
  { code: "MAL", name: "Malayalam" },
  {
    code: "CMN",
    name: "Mandarin Chinese",
    aliases: ["Chinese", "Mandarin"],
    attraction: "Great Wall of China",
    attractionIso2: "CN",
  },
  { code: "MAR", name: "Marathi" },
  { code: "NEP", name: "Nepali", attraction: "Mount Everest", attractionIso2: "NP" },
  {
    code: "NOR",
    name: "Norwegian",
    aliases: ["Norwegian Bokmål", "Norwegian Nynorsk", "Bokmål", "Nynorsk"],
    attraction: "Geirangerfjord",
    attractionIso2: "NO",
  },
  {
    code: "PUS",
    name: "Pashto",
    attraction: "Band-e Amir National Park",
    attractionIso2: "AF",
  },
  {
    code: "FAS",
    name: "Persian",
    aliases: ["Persian (Farsi)", "Farsi"],
    attraction: "Persepolis",
    attractionIso2: "IR",
  },
  { code: "POL", name: "Polish", attraction: "Wawel Castle", attractionIso2: "PL" },
  {
    code: "POR",
    name: "Portuguese",
    attraction: "Christ the Redeemer",
    attractionIso2: "BR",
  },
  { code: "PAN", name: "Punjabi" },
  {
    code: "RON",
    name: "Romanian",
    aliases: ["Moldavian"],
    attraction: "Bran Castle",
    attractionIso2: "RO",
  },
  {
    code: "RUS",
    name: "Russian",
    attraction: "Saint Basil's Cathedral",
    attractionIso2: "RU",
  },
  { code: "SRP", name: "Serbian", attraction: "Belgrade Fortress", attractionIso2: "RS" },
  { code: "SND", name: "Sindhi" },
  { code: "SLK", name: "Slovak", attraction: "Spiš Castle", attractionIso2: "SK" },
  {
    code: "SLV",
    name: "Slovenian",
    aliases: ["Slovene"],
    attraction: "Lake Bled",
    attractionIso2: "SI",
  },
  { code: "SOM", name: "Somali", attraction: "Laas Geel", attractionIso2: "SO" },
  { code: "SPA", name: "Spanish", attraction: "Alhambra", attractionIso2: "ES" },
  { code: "SWA", name: "Swahili", attraction: "Mount Kilimanjaro", attractionIso2: "TZ" },
  { code: "SWE", name: "Swedish", attraction: "Vasa Museum", attractionIso2: "SE" },
  {
    code: "TAM",
    name: "Tamil",
    attraction: "Meenakshi Amman Temple",
    attractionIso2: "IN",
  },
  { code: "TEL", name: "Telugu" },
  { code: "THA", name: "Thai", attraction: "Wat Arun", attractionIso2: "TH" },
  { code: "TUR", name: "Turkish", attraction: "Hagia Sophia", attractionIso2: "TR" },
  {
    code: "UKR",
    name: "Ukrainian",
    attraction: "Saint Sophia Cathedral",
    attractionIso2: "UA",
  },
  { code: "URD", name: "Urdu", attraction: "Badshahi Mosque", attractionIso2: "PK" },
  { code: "VIE", name: "Vietnamese", attraction: "Ha Long Bay", attractionIso2: "VN" },
  { code: "CYM", name: "Welsh" },
];

function normalizeLanguageName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SUPPORTED_BY_NORMALIZED = (() => {
  const map = new Map<string, SupportedLanguage>();
  for (const lang of SUPPORTED_LANGUAGES) {
    map.set(normalizeLanguageName(lang.name), lang);
    for (const alias of lang.aliases ?? []) {
      map.set(normalizeLanguageName(alias), lang);
    }
  }
  return map;
})();

export function resolveSupportedLanguage(
  displayName: string
): SupportedLanguage | null {
  return SUPPORTED_BY_NORMALIZED.get(normalizeLanguageName(displayName)) ?? null;
}

export function isLanguageSupported(displayName: string): boolean {
  return resolveSupportedLanguage(displayName) !== null;
}

export type ScenarioId = "capital" | "kitchen" | "attraction" | "market";

export type ScenarioOption = {
  id: ScenarioId;
  label: string;
};

export function getScenarioOptions(
  capital: string,
  languageDisplayName: string,
  countryIso2: string
): ScenarioOption[] {
  const capitalLabel = capital?.trim() ? capital.trim() : "the capital city";
  const options: ScenarioOption[] = [
    { id: "capital", label: `Let's go to ${capitalLabel}` },
    { id: "kitchen", label: "Let's go to my kitchen" },
  ];

  const supported = resolveSupportedLanguage(languageDisplayName);
  if (
    supported?.attraction &&
    supported.attractionIso2 &&
    supported.attractionIso2 === countryIso2
  ) {
    options.push({
      id: "attraction",
      label: `Let's go to ${supported.attraction}`,
    });
  }

  options.push({ id: "market", label: "Let's go to the market" });
  return options;
}
