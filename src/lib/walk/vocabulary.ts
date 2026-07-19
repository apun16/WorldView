import type { DestinationId } from "@/lib/destinations";
import { resolveSupportedLanguage } from "@/lib/supported-languages";

export type TaughtWord = {
  term: string;
  /** Transliteration, where the script is not Latin. */
  roman?: string;
  gloss: string;
};

type LanguageVocabulary = {
  greeting: TaughtWord;
  byDestination: Record<DestinationId, TaughtWord[]>;
};

// Keyed by the language codes in supported-languages.ts. Only a handful of
// languages are filled in; every other country still walks, just without
// vocabulary — the same graceful-degradation shape as the photosphere fallback.
const VOCABULARY: Record<string, LanguageVocabulary> = {
  SPA: {
    greeting: { term: "Hola", gloss: "hello" },
    byDestination: {
      market: [
        { term: "el mercado", gloss: "the market" },
        { term: "¿Cuánto cuesta?", gloss: "how much does it cost?" },
      ],
      home: [
        { term: "la casa", gloss: "the house" },
        { term: "Buen provecho", gloss: "enjoy your meal" },
      ],
      school: [
        { term: "la escuela", gloss: "the school" },
        { term: "aprender", gloss: "to learn" },
      ],
      nature: [
        { term: "el campo", gloss: "the countryside" },
        { term: "el árbol", gloss: "the tree" },
      ],
      street: [
        { term: "la calle", gloss: "the street" },
        { term: "¿Qué tal?", gloss: "how's it going?" },
      ],
    },
  },
  FRA: {
    greeting: { term: "Bonjour", gloss: "hello" },
    byDestination: {
      market: [
        { term: "le marché", gloss: "the market" },
        { term: "C'est combien ?", gloss: "how much is it?" },
      ],
      home: [
        { term: "la maison", gloss: "the house" },
        { term: "à table", gloss: "come and eat" },
      ],
      school: [
        { term: "l'école", gloss: "the school" },
        { term: "apprendre", gloss: "to learn" },
      ],
      nature: [
        { term: "la forêt", gloss: "the forest" },
        { term: "le sentier", gloss: "the path" },
      ],
      street: [
        { term: "la rue", gloss: "the street" },
        { term: "Ça va ?", gloss: "how are you?" },
      ],
    },
  },
  JPN: {
    greeting: { term: "こんにちは", roman: "konnichiwa", gloss: "hello" },
    byDestination: {
      market: [
        { term: "市場", roman: "ichiba", gloss: "market" },
        { term: "いくらですか", roman: "ikura desu ka", gloss: "how much is it?" },
      ],
      home: [
        { term: "家", roman: "ie", gloss: "house" },
        { term: "いただきます", roman: "itadakimasu", gloss: "said before eating" },
      ],
      school: [
        { term: "学校", roman: "gakkō", gloss: "school" },
        { term: "習う", roman: "narau", gloss: "to learn" },
      ],
      nature: [
        { term: "山", roman: "yama", gloss: "mountain" },
        { term: "川", roman: "kawa", gloss: "river" },
      ],
      street: [
        { term: "道", roman: "michi", gloss: "street, road" },
        { term: "お元気ですか", roman: "ogenki desu ka", gloss: "how are you?" },
      ],
    },
  },
  HIN: {
    greeting: { term: "नमस्ते", roman: "namaste", gloss: "hello" },
    byDestination: {
      market: [
        { term: "बाज़ार", roman: "bāzār", gloss: "market" },
        { term: "कितने का है", roman: "kitne kā hai", gloss: "how much is it?" },
      ],
      home: [
        { term: "घर", roman: "ghar", gloss: "home" },
        { term: "खाना", roman: "khānā", gloss: "food" },
      ],
      school: [
        { term: "विद्यालय", roman: "vidyālay", gloss: "school" },
        { term: "सीखना", roman: "sīkhnā", gloss: "to learn" },
      ],
      nature: [
        { term: "पेड़", roman: "peṛ", gloss: "tree" },
        { term: "नदी", roman: "nadī", gloss: "river" },
      ],
      street: [
        { term: "सड़क", roman: "saṛak", gloss: "street" },
        { term: "आप कैसे हैं", roman: "āp kaise haiṅ", gloss: "how are you?" },
      ],
    },
  },
  ARA: {
    greeting: { term: "مرحبا", roman: "marhaban", gloss: "hello" },
    byDestination: {
      market: [
        { term: "السوق", roman: "as-sūq", gloss: "the market" },
        { term: "بكم هذا", roman: "bikam hādhā", gloss: "how much is this?" },
      ],
      home: [
        { term: "البيت", roman: "al-bayt", gloss: "the house" },
        { term: "أهلا وسهلا", roman: "ahlan wa sahlan", gloss: "welcome" },
      ],
      school: [
        { term: "المدرسة", roman: "al-madrasa", gloss: "the school" },
        { term: "يتعلم", roman: "yataʿallam", gloss: "to learn" },
      ],
      nature: [
        { term: "الصحراء", roman: "aṣ-ṣaḥrāʾ", gloss: "the desert" },
        { term: "الشجرة", roman: "ash-shajara", gloss: "the tree" },
      ],
      street: [
        { term: "الشارع", roman: "ash-shāriʿ", gloss: "the street" },
        { term: "كيف حالك", roman: "kayfa ḥāluk", gloss: "how are you?" },
      ],
    },
  },
  SWA: {
    greeting: { term: "Jambo", gloss: "hello" },
    byDestination: {
      market: [
        { term: "soko", gloss: "market" },
        { term: "Bei gani?", gloss: "what price?" },
      ],
      home: [
        { term: "nyumbani", gloss: "at home" },
        { term: "karibu", gloss: "welcome" },
      ],
      school: [
        { term: "shule", gloss: "school" },
        { term: "kujifunza", gloss: "to learn" },
      ],
      nature: [
        { term: "mlima", gloss: "mountain" },
        { term: "mti", gloss: "tree" },
      ],
      street: [
        { term: "barabara", gloss: "road" },
        { term: "Habari?", gloss: "how are you?" },
      ],
    },
  },
};

export type LanguageVocabularyResult = {
  /** Display name of the language the words are in. */
  language: string;
  greeting: TaughtWord;
  words: TaughtWord[];
};

/**
 * Vocabulary for a destination in a language, or null when we have no words —
 * an unsupported language must still walk, just without the word cards.
 */
export function vocabularyFor(
  languageDisplayName: string | null | undefined,
  destination: DestinationId
): LanguageVocabularyResult | null {
  if (!languageDisplayName) return null;

  const supported = resolveSupportedLanguage(languageDisplayName);
  if (!supported) return null;

  const entry = VOCABULARY[supported.code];
  if (!entry) return null;

  return {
    language: supported.name,
    greeting: entry.greeting,
    words: entry.byDestination[destination] ?? [],
  };
}

/** Languages we can actually teach, for callers choosing a default. */
export function hasVocabulary(languageDisplayName: string): boolean {
  const supported = resolveSupportedLanguage(languageDisplayName);
  return supported ? supported.code in VOCABULARY : false;
}
