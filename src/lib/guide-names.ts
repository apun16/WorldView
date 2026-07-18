import type { CountryProperties } from "@/lib/geo-types";

export type NamePool = { female: string[]; male: string[] };

/** Everything region resolution needs — matches both CountryFeature.properties
 * and the lighter CountryInfo used where full geometry isn't loaded. */
export type CountryLike = Pick<CountryProperties, "iso2" | "continent" | "languages">;

// Regional/cultural name pools. Grouped by language family or shared cultural
// region rather than one-per-country, so 177 countries stay maintainable
// while guides still sound like they belong where they stand.
const POOLS: Record<string, NamePool> = {
  anglo: {
    female: ["Emma", "Grace", "Olivia", "Charlotte", "Sophie", "Amelia"],
    male: ["Liam", "Jack", "Oliver", "Ethan", "Henry", "James"],
  },
  "west-africa": {
    female: ["Amara", "Adaeze", "Folake", "Ngozi", "Efua", "Chiamaka"],
    male: ["Kwame", "Kofi", "Emeka", "Chike", "Kojo", "Femi"],
  },
  "east-africa": {
    female: ["Amani", "Zawadi", "Wanjiru", "Achieng", "Furaha", "Nia"],
    male: ["Baraka", "Juma", "Otieno", "Kiptoo", "Wekesa", "Mwangi"],
  },
  "southern-africa": {
    female: ["Thandiwe", "Nomvula", "Precious", "Refilwe", "Lindiwe", "Karabo"],
    male: ["Sipho", "Tendai", "Tapiwa", "Themba", "Kagiso", "Lesedi"],
  },
  "francophone-africa": {
    female: ["Aïcha", "Fatoumata", "Mariam", "Aminata", "Awa", "Rokia"],
    male: ["Ibrahima", "Moussa", "Souleymane", "Boubacar", "Cheikh", "Alassane"],
  },
  "horn-of-africa": {
    female: ["Selam", "Hana", "Meron", "Bethlehem", "Eden", "Sara"],
    male: ["Abel", "Dawit", "Yonas", "Solomon", "Elias", "Nathan"],
  },
  somali: {
    female: ["Amina", "Hodan", "Sagal", "Ifrah", "Nasteho", "Sahra"],
    male: ["Abdullahi", "Mohamed", "Yusuf", "Farah", "Guled", "Warsame"],
  },
  caribbean: {
    female: ["Alisha", "Kezia", "Nia", "Simone", "Tanisha", "Odalys"],
    male: ["Malachi", "Jaylen", "Andre", "Desmond", "Rasheed", "Delroy"],
  },
  "pacific-islander": {
    female: ["Litia", "Marama", "Sela", "Vika", "Ana", "Tui"],
    male: ["Sione", "Tevita", "Manu", "Aleki", "Etuate", "Filipe"],
  },
  arabic: {
    female: ["Layla", "Yasmin", "Noor", "Rania", "Sara", "Amira"],
    male: ["Omar", "Youssef", "Karim", "Tariq", "Hassan", "Ziad"],
  },
  "french-europe": {
    female: ["Chloé", "Camille", "Manon", "Léa", "Juliette", "Margaux"],
    male: ["Louis", "Hugo", "Antoine", "Nicolas", "Théo", "Baptiste"],
  },
  "spanish-europe": {
    female: ["Lucía", "Carmen", "Paula", "Elena", "Marta", "Sofía"],
    male: ["Pablo", "Javier", "Diego", "Álvaro", "Mateo", "Iker"],
  },
  "spanish-latin-america": {
    female: ["Valentina", "Camila", "Isabella", "Ximena", "Renata", "Daniela"],
    male: ["Mateo", "Santiago", "Sebastián", "Emiliano", "Joaquín", "Nicolás"],
  },
  guarani: {
    female: ["Yasy", "Arami", "Panambi", "Poty", "Ita", "Yvoty"],
    male: ["Ara", "Guyra", "Jasy", "Kuarahy", "Tupã", "Yaguar"],
  },
  aymara: {
    female: ["Sami", "Wara", "Nayra", "Kantuta", "Chaska", "Q'illa"],
    male: ["Choque", "Wayra", "Amaru", "Illa", "Kusi", "Sinchi"],
  },
  "portuguese-europe": {
    female: ["Beatriz", "Matilde", "Leonor", "Inês", "Mariana", "Carolina"],
    male: ["João", "Tiago", "Rodrigo", "Afonso", "Duarte", "Gonçalo"],
  },
  lusophone: {
    female: ["Beatriz", "Ana", "Iracema", "Zuri", "Nia", "Luisa"],
    male: ["Rafael", "Gabriel", "Nelson", "Armando", "Zeca", "Baltazar"],
  },
  german: {
    female: ["Freya", "Greta", "Lena", "Marlene", "Klara", "Annika"],
    male: ["Finn", "Jonas", "Lukas", "Matthias", "Sebastian", "Felix"],
  },
  italian: {
    female: ["Giulia", "Chiara", "Alessia", "Martina", "Federica", "Valentina"],
    male: ["Marco", "Luca", "Matteo", "Alessandro", "Davide", "Riccardo"],
  },
  dutch: {
    female: ["Sanne", "Fleur", "Anouk", "Femke", "Lotte", "Noor"],
    male: ["Daan", "Bram", "Sem", "Thijs", "Lars", "Jesse"],
  },
  russian: {
    female: ["Anastasia", "Ekaterina", "Olga", "Natasha", "Irina", "Svetlana"],
    male: ["Dmitri", "Ivan", "Nikolai", "Sergei", "Alexei", "Pavel"],
  },
  "slavic-eastern": {
    female: ["Kasia", "Zofia", "Milena", "Ana", "Jana", "Nikolina"],
    male: ["Jakub", "Tomasz", "Andrej", "Marek", "Vlad", "Bogdan"],
  },
  baltic: {
    female: ["Ieva", "Laura", "Kristina", "Gerda", "Rasa", "Aiste"],
    male: ["Karlis", "Mindaugas", "Tanel", "Rihards", "Andrus", "Vytautas"],
  },
  balkan: {
    female: ["Elena", "Ioanna", "Ana", "Teodora", "Ines", "Marija"],
    male: ["Nikos", "Dimitri", "Stefan", "Andrei", "Luka", "Petar"],
  },
  nordic: {
    female: ["Freja", "Astrid", "Ingrid", "Saga", "Elin", "Maja"],
    male: ["Erik", "Oskar", "Anders", "Magnus", "Lars", "Bjorn"],
  },
  caucasus: {
    female: ["Nino", "Ani", "Tamar", "Anahit", "Lia", "Salome"],
    male: ["Giorgi", "Levan", "Vahan", "Aram", "Davit", "Nika"],
  },
  "central-asia": {
    female: ["Aigerim", "Aizhan", "Saltanat", "Dinara", "Botagoz", "Zarina"],
    male: ["Nursultan", "Azamat", "Bekzat", "Erlan", "Timur", "Baurzhan"],
  },
  mongolian: {
    female: ["Altantsetseg", "Bolor", "Enkhtuya", "Narangerel", "Oyun", "Saruul"],
    male: ["Batbayar", "Ganzorig", "Munkh", "Temuulen", "Bilguun", "Erdene"],
  },
  persian: {
    female: ["Yasaman", "Setareh", "Roya", "Mahsa", "Niloofar", "Anahita"],
    male: ["Kian", "Cyrus", "Darius", "Farhad", "Kaveh", "Reza"],
  },
  turkic: {
    female: ["Elif", "Zeynep", "Deniz", "Aylin", "Ece", "Selin"],
    male: ["Emre", "Mehmet", "Kaan", "Baris", "Cem", "Onur"],
  },
  chinese: {
    female: ["Mei", "Xin", "Ling", "Yan", "Hui", "Xiu"],
    male: ["Wei", "Jun", "Hao", "Feng", "Chen", "Ming"],
  },
  japanese: {
    female: ["Yui", "Sakura", "Aoi", "Haruka", "Rin", "Mio"],
    male: ["Sora", "Ren", "Haruto", "Yuto", "Sota", "Kaito"],
  },
  korean: {
    female: ["Ji-woo", "Seo-yeon", "Ha-eun", "Min-ji", "Yuna", "Soo-jin"],
    male: ["Min-jun", "Do-yoon", "Ji-ho", "Joon-ho", "Hyun-woo", "Sung-min"],
  },
  vietnamese: {
    female: ["Linh", "Mai", "Huong", "Thao", "Ngoc", "An"],
    male: ["Minh", "Duc", "Nam", "Khoa", "Tuan", "Phong"],
  },
  thai: {
    female: ["Suda", "Malee", "Kanya", "Ratana", "Ploy", "Siri"],
    male: ["Somchai", "Anan", "Chai", "Niran", "Prasert", "Kiet"],
  },
  khmer: {
    female: ["Sopheak", "Chenda", "Sreymom", "Vanna", "Bopha", "Malis"],
    male: ["Sokha", "Vibol", "Pisach", "Rithy", "Sovann", "Chan"],
  },
  lao: {
    female: ["Dala", "Malai", "Nokeo", "Souda", "Vieng", "Amphone"],
    male: ["Bounma", "Khamsing", "Somsak", "Thongchai", "Vongsa", "Phet"],
  },
  burmese: {
    female: ["Thandar", "Aye", "Su Su", "Khin", "Nandar", "Yadanar"],
    male: ["Aung", "Zaw", "Min", "Htet", "Kyaw", "Thura"],
  },
  malay: {
    female: ["Nur", "Siti", "Aisyah", "Farah", "Aina", "Balqis"],
    male: ["Amir", "Zul", "Hafiz", "Faiz", "Iqbal", "Rizal"],
  },
  indonesian: {
    female: ["Putri", "Dewi", "Ayu", "Sari", "Wulan", "Indah"],
    male: ["Budi", "Agus", "Eko", "Andi", "Bayu", "Dedi"],
  },
  filipino: {
    female: ["Maria", "Angel", "Kristine", "Joy", "Marites", "Divina"],
    male: ["Jose", "Ramon", "Mark", "Angelo", "Ferdinand", "Noel"],
  },
  "south-asia-hindi": {
    female: ["Priya", "Ananya", "Kavya", "Ishita", "Diya", "Meera"],
    male: ["Arjun", "Rohan", "Vikram", "Aditya", "Karan", "Rahul"],
  },
  "south-asia-urdu": {
    female: ["Ayesha", "Hina", "Sana", "Mahnoor", "Areeba", "Zainab"],
    male: ["Ahmed", "Bilal", "Usman", "Hamza", "Faisal", "Imran"],
  },
  bengali: {
    female: ["Ananya", "Piya", "Rupa", "Mitali", "Sharmin", "Tasnim"],
    male: ["Arif", "Rahim", "Shakib", "Faruk", "Tanvir", "Sujon"],
  },
  nepali: {
    female: ["Sabina", "Sita", "Anita", "Puja", "Sunita", "Kabita"],
    male: ["Bikash", "Suman", "Prakash", "Rajesh", "Dipesh", "Sagar"],
  },
  sinhala: {
    female: ["Nimali", "Chathurika", "Sanduni", "Dilani", "Kumari", "Ishara"],
    male: ["Sunil", "Kasun", "Nuwan", "Chamara", "Ruwan", "Prasad"],
  },
  himalayan: {
    female: ["Pema", "Dechen", "Yangchen", "Tshomo", "Sonam", "Karma"],
    male: ["Tenzin", "Karma", "Sonam", "Ugyen", "Jigme", "Namgyal"],
  },
  afrikaans: {
    female: ["Anika", "Elna", "Marlise", "Retha", "Suzette", "Wilma"],
    male: ["Pieter", "Johan", "Hendrik", "Cornelius", "Stefan", "Willem"],
  },
  global: {
    female: ["Nadia", "Sofia", "Zara", "Elena", "Mei", "Priya"],
    male: ["Rafael", "Tomas", "Lucas", "Andres", "Ravi", "Theo"],
  },
};

// Only the 4 "big colonial" languages need continent-aware resolution — every
// other language here is geographically concentrated enough that the
// language alone tells us the right pool.
const LANGUAGE_TO_REGION: Record<string, string> = {
  Arabic: "arabic",
  Berber: "arabic",
  "Haitian Creole": "caribbean",
  "Belizean Creole": "caribbean",
  German: "german",
  "Swiss German": "german",
  "Austro-Bavarian German": "german",
  Italian: "italian",
  Dutch: "dutch",
  Russian: "russian",
  Polish: "slavic-eastern",
  Czech: "slavic-eastern",
  Slovak: "slavic-eastern",
  Ukrainian: "slavic-eastern",
  Belarusian: "slavic-eastern",
  Bulgarian: "slavic-eastern",
  Serbian: "slavic-eastern",
  Croatian: "slavic-eastern",
  Bosnian: "slavic-eastern",
  Slovene: "slavic-eastern",
  Macedonian: "slavic-eastern",
  Montenegrin: "slavic-eastern",
  Lithuanian: "baltic",
  Latvian: "baltic",
  Estonian: "baltic",
  Greek: "balkan",
  Albanian: "balkan",
  Romanian: "balkan",
  Moldavian: "balkan",
  Hungarian: "balkan",
  Swedish: "nordic",
  Norwegian: "nordic",
  "Norwegian Nynorsk": "nordic",
  Danish: "nordic",
  Finnish: "nordic",
  Icelandic: "nordic",
  Greenlandic: "nordic",
  Georgian: "caucasus",
  Armenian: "caucasus",
  Azerbaijani: "caucasus",
  Kazakh: "central-asia",
  Kyrgyz: "central-asia",
  Uzbek: "central-asia",
  Turkmen: "central-asia",
  Tajik: "central-asia",
  Mongolian: "mongolian",
  "Persian (Farsi)": "persian",
  Dari: "persian",
  Pashto: "persian",
  Turkish: "turkic",
  Chinese: "chinese",
  Japanese: "japanese",
  Korean: "korean",
  Vietnamese: "vietnamese",
  Thai: "thai",
  Khmer: "khmer",
  Lao: "lao",
  Burmese: "burmese",
  Malay: "malay",
  Indonesian: "indonesian",
  Filipino: "filipino",
  Hindi: "south-asia-hindi",
  Tamil: "south-asia-hindi",
  Urdu: "south-asia-urdu",
  Bengali: "bengali",
  Nepali: "nepali",
  Sinhala: "sinhala",
  Dzongkha: "himalayan",
  Afrikaans: "afrikaans",
  Amharic: "horn-of-africa",
  Somali: "somali",
  Guaraní: "guarani",
  Aymara: "aymara",
};

// Cases the language/continent heuristic gets wrong on its own — settler-Anglo
// nations that would otherwise fall to a co-official language, and small
// island/Creole nations without a specific regional pool.
const ISO2_OVERRIDE: Record<string, string> = {
  US: "anglo", CA: "anglo", GB: "anglo", IE: "anglo", AU: "anglo", NZ: "anglo",
  GH: "west-africa", GM: "west-africa", LR: "west-africa", NG: "west-africa", SL: "west-africa",
  BW: "southern-africa", LS: "southern-africa", MW: "southern-africa", SZ: "southern-africa", ZM: "southern-africa",
  ZA: "southern-africa", NA: "southern-africa",
  KE: "east-africa", RW: "east-africa", SS: "east-africa", TZ: "east-africa", UG: "east-africa",
  CM: "francophone-africa",
  BS: "caribbean", JM: "caribbean", TT: "caribbean", GY: "caribbean", BZ: "caribbean",
  PR: "spanish-latin-america",
  FJ: "pacific-islander", PG: "pacific-islander", SB: "pacific-islander",
};

function resolveRegionKey(country: CountryLike): string {
  const { iso2, continent, languages } = country;

  if (ISO2_OVERRIDE[iso2]) return ISO2_OVERRIDE[iso2];

  for (const lang of languages) {
    if (lang === "English" || lang === "French" || lang === "Spanish" || lang === "Portuguese") continue;
    if (LANGUAGE_TO_REGION[lang]) return LANGUAGE_TO_REGION[lang];
  }

  for (const lang of languages) {
    if (lang === "French") return continent === "Europe" ? "french-europe" : "francophone-africa";
    if (lang === "Spanish") return continent === "Europe" ? "spanish-europe" : "spanish-latin-america";
    if (lang === "Portuguese") return continent === "Europe" ? "portuguese-europe" : "lusophone";
    if (lang === "English") return "anglo";
  }

  return "global";
}

export function getNamePoolForCountry(country: CountryLike): NamePool {
  return POOLS[resolveRegionKey(country)] ?? POOLS.global;
}
