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
 * Speak text in French using the Web Speech API
 */
export async function speakFrench(text: string): Promise<void> {
  const voices = await getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  window.speechSynthesis.speak(utterance);
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
  return voices.filter((v) => v.lang.startsWith("fr"));
}
