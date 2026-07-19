import type { Language } from "@elevenlabs/client";
import {
  isLanguageSupported,
  resolveSupportedLanguage,
} from "@/lib/supported-languages";

/** Map our language codes / display names → ElevenLabs agent language codes. */
const ELEVENLABS_BY_CODE: Record<string, Language> = {
  AFR: "af",
  ARA: "ar",
  HYE: "hy",
  ASM: "as",
  AZE: "az",
  BEL: "be",
  BEN: "bn",
  BOS: "bs",
  BUL: "bg",
  CAT: "ca",
  CEB: "tl", // closest available; Cebuano not listed separately
  NYA: "en", // Chichewa not in agent language enum — fall back gently
  HRV: "hr",
  CES: "cs",
  DAN: "da",
  NLD: "nl",
  ENG: "en",
  EST: "et",
  FIL: "tl",
  FIN: "fi",
  FRA: "fr",
  GLG: "gl",
  KAT: "ka",
  DEU: "de",
  ELL: "el",
  GUJ: "gu",
  HAU: "ha",
  HEB: "he",
  HIN: "hi",
  HUN: "hu",
  ISL: "is",
  IND: "id",
  GLE: "ga",
  ITA: "it",
  JPN: "ja",
  JAV: "jv",
  KAN: "kn",
  KAZ: "kk",
  KIR: "ky",
  KOR: "ko",
  LAV: "lv",
  LIN: "en", // Lingala not in enum
  LIT: "lt",
  LTZ: "lb",
  MKD: "mk",
  MSA: "ms",
  MAL: "ml",
  CMN: "zh",
  MAR: "mr",
  NEP: "ne",
  NOR: "no",
  PUS: "ps",
  FAS: "fa",
  POL: "pl",
  POR: "pt",
  PAN: "pa",
  RON: "ro",
  RUS: "ru",
  SRP: "sr",
  SND: "sd",
  SLK: "sk",
  SLV: "sl",
  SOM: "so",
  SPA: "es",
  SWA: "sw",
  SWE: "sv",
  TAM: "ta",
  TEL: "te",
  THA: "th",
  TUR: "tr",
  UKR: "uk",
  URD: "ur",
  VIE: "vi",
  CYM: "cy",
};

export type WalkLanguage = {
  displayName: string;
  elevenLabsCode: Language;
  supported: boolean;
};

/**
 * Pick a walk language from a country's spoken list.
 * Prefers the first WorldView-supported language; otherwise English.
 */
export function pickWalkLanguage(countryLanguages: string[]): WalkLanguage {
  const preferred =
    countryLanguages.find(isLanguageSupported) ??
    countryLanguages.find((l) => /english/i.test(l)) ??
    "English";

  const resolved = resolveSupportedLanguage(preferred);
  const elevenLabsCode: Language = resolved
    ? (ELEVENLABS_BY_CODE[resolved.code] ?? "en")
    : "en";

  return {
    displayName: resolved?.name ?? preferred,
    elevenLabsCode,
    supported: resolved !== null,
  };
}

export function elevenLabsCodeForDisplayName(
  displayName: string
): Language | null {
  const resolved = resolveSupportedLanguage(displayName);
  if (!resolved) return null;
  return ELEVENLABS_BY_CODE[resolved.code] ?? null;
}
