/**
 * Get a list of available voices
 * Handles the async nature of speechSynthesis.getVoices()
 */
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();

    if (voices.length) {
      resolve(voices);
    } else {
      // Voices not loaded yet, wait for the event
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
}

/**
 * Find the best voice for a given language
 */
function findBestVoice(
  voices: SpeechSynthesisVoice[],
  langCode: string
): SpeechSynthesisVoice | null {
  const langPrefix = langCode.split("-")[0]; // "fr-FR" -> "fr"

  // Priority 1: Same language, different region (e.g., "fr-CA" for "fr-FR")
  let voice = voices.find((v) => v.lang.startsWith(langPrefix));
  if (voice) return voice;

  // Priority 2: Any voice with similar language code (case-insensitive)
  voice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (voice) return voice;

  return null;
}

/**
 * Speak text using the Web Speech API
 */
export async function speak(text: string, langCode: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const voices = await getVoices();
    const selectedVoice = findBestVoice(voices, langCode);

    console.log(`[TTS] Speaking "${text}" in ${langCode}`);
    console.log(
      `[TTS] Selected voice:`,
      selectedVoice?.name,
      selectedVoice?.lang
    );

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.85; // Slightly slower for language learning
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Handle completion and errors
    utterance.onend = () => {
      console.log("[TTS] Speech finished");
      resolve();
    };

    utterance.onerror = (event) => {
      console.error("[TTS] Speech error:", event.error);
      reject(new Error(`Speech synthesis failed: ${event.error}`));
    };

    utterance.onstart = () => {
      console.log("[TTS] Speech started");
    };

    // Only cancel if something is currently speaking
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      // Small delay to ensure cancel completes before starting new speech
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  });
}

/**
 * Stop any currently playing speech
 */
export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

/**
 * Get all available French voices for user selection
 */
export async function getFrenchVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await getVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith("fr"));
}

/**
 * Get all available Spanish voices for user selection
 */
export async function getSpanishVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await getVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
}

/**
 * Get all available voices for a language code
 */
export async function getVoicesForLanguage(
  langCode: string
): Promise<SpeechSynthesisVoice[]> {
  const voices = await getVoices();
  const langPrefix = langCode.split("-")[0].toLowerCase();
  return voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
}

/**
 * Log all available voices (for debugging)
 */
export async function logAvailableVoices(): Promise<void> {
  const voices = await getVoices();
  console.log("[TTS] Available voices:");
  voices.forEach((voice) => {
    console.log(
      `  - ${voice.name} (${voice.lang}) [${
        voice.localService ? "local" : "remote"
      }]`
    );
  });
}
