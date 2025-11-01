import type { SupportedLanguage } from "../utils/translationConfig";

/**
 * Pronunciation Service - Validates pronunciation using Prompt API with audio input
 */
class PronunciationService {
  private session: any = null;
  private isInitialized = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  /**
   * Initialize the Prompt API session with audio input support
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.session) {
      return;
    }

    try {
      // Check availability
      const availability = await (self as any).LanguageModel.availability();

      if (availability === "unavailable") {
        throw new Error("Prompt API is not available");
      }

      // Get default parameters
      const params = await (self as any).LanguageModel.params();

      // Create session with audio input support
      this.session = await (self as any).LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        expectedInputs: [
          { type: "text" },
          { type: "audio" }, // Enable audio input
        ],
        expectedOutputs: [{ type: "text" }],
      });

      this.isInitialized = true;
      console.log("[PronunciationService] Initialized with audio support");
    } catch (error) {
      console.error("[PronunciationService] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    try {
      // Check if permission is already granted to avoid unnecessary prompts
      const permissionStatus = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      if (permissionStatus.state === "denied") {
        throw new Error("Microphone permission denied");
      }

      // Get media stream (will prompt only if permission state is 'prompt')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log("[PronunciationService] Recording started");
    } catch (error) {
      console.error("[PronunciationService] Failed to start recording:", error);
      throw new Error("Microphone access denied or not available");
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

        // Stop all tracks to release microphone
        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

        console.log("[PronunciationService] Recording stopped");
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Validate pronunciation by comparing recorded audio with expected word
   */
  async validatePronunciation(
    audioBlob: Blob,
    expectedWord: string,
    targetLanguage: SupportedLanguage
  ): Promise<{
    isCorrect: boolean;
    transcription: string;
    feedback: string;
  }> {
    if (!this.isInitialized || !this.session) {
      await this.initialize();
    }

    const languageCode = targetLanguage === "french" ? "fr" : "es";
    const languageName = targetLanguage === "french" ? "French" : "Spanish";

    try {
      // Convert Blob to File for Prompt API
      const audioFile = new File([audioBlob], "pronunciation.webm", {
        type: audioBlob.type,
      });

      // Send audio + text prompt to Prompt API
      const prompt = `Listen to the audio recording and transcribe what the person said in ${languageName}.

Expected word: "${expectedWord}"

Task:
1. Transcribe the audio in ${languageName}
2. Compare it to the expected word "${expectedWord}"
3. Respond with ONLY a JSON object in this exact format:
{
  "transcription": "what you heard",
  "isCorrect": true or false,
  "feedback": "brief feedback on pronunciation"
}`;

      const response = await this.session.prompt([
        {
          role: "user",
          content: [
            { type: "text", value: prompt },
            { type: "audio", value: audioFile },
          ],
        },
      ]);

      console.log("[PronunciationService] Response:", response);

      // Clean markdown code blocks if present
      let cleaned = response.trim();

      // Remove ```json and ``` markers
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
      }

      cleaned = cleaned.trim();

      // Parse JSON response
      const result = JSON.parse(cleaned);

      return {
        isCorrect: result.isCorrect || false,
        transcription: result.transcription || "",
        feedback: result.feedback || "Could not analyze pronunciation",
      };
    } catch (error) {
      console.error("[PronunciationService] Validation failed:", error);

      // Fallback: Use Web Speech API for basic transcription
      return this.fallbackValidation(audioBlob, expectedWord, targetLanguage);
    }
  }

  /**
   * Fallback validation using Web Speech API
   */
  private async fallbackValidation(
    audioBlob: Blob,
    expectedWord: string,
    targetLanguage: SupportedLanguage
  ): Promise<{
    isCorrect: boolean;
    transcription: string;
    feedback: string;
  }> {
    console.log("[PronunciationService] Using fallback Web Speech API");

    // For now, return a placeholder
    // In production, you could implement Web Speech API transcription here
    return {
      isCorrect: false,
      transcription: "Unable to transcribe",
      feedback: "Please try again with clearer pronunciation",
    };
  }

  /**
   * Check if browser supports required APIs
   */
  async checkSupport(): Promise<{
    microphone: boolean;
    promptAPI: boolean;
    audioInput: boolean;
  }> {
    const hasMicrophone = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );

    let hasPromptAPI = false;
    let hasAudioInput = false;

    try {
      const availability = await (self as any).LanguageModel?.availability();
      hasPromptAPI = availability !== "unavailable";

      // Try to create a session with audio to check support
      if (hasPromptAPI) {
        const testSession = await (self as any).LanguageModel.create({
          expectedInputs: [{ type: "audio" }],
        });
        hasAudioInput = true;
        testSession.destroy();
      }
    } catch (error) {
      console.log("[PronunciationService] Audio input not supported");
      hasAudioInput = false;
    }

    return {
      microphone: hasMicrophone,
      promptAPI: hasPromptAPI,
      audioInput: hasAudioInput,
    };
  }

  /**
   * Destroy the session
   */
  destroy(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }

    if (this.session) {
      this.session.destroy();
      this.session = null;
      this.isInitialized = false;
      console.log("[PronunciationService] Session destroyed");
    }
  }
}

export const pronunciationService = new PronunciationService();
