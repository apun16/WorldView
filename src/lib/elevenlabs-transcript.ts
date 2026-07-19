/**
 * ElevenLabs expressive mode inserts delivery tags like `[excited]` / `[warm]`
 * into the agent text. They shape the voice; strip them for on-screen reading.
 * Also drops bracketed meta asides such as `[Note: …]`.
 */
export function stripAudioTags(text: string): string {
  return text
    .replace(/\[[^\]]*]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}
