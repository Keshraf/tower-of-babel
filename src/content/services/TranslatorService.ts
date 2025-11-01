interface TranslationResult {
  originalWord: string;
  translatedWord: string;
}

/**
 * Service for translating text using Translator API
 */
class TranslatorService {
  private translator: any = null;
  private sourceLanguage: string = "en";
  private targetLanguage: string = "fr";
  private initPromise: Promise<void> | null = null;

  /**
   * Check if Translator API is available
   */
  async isAvailable(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      if (!("Translator" in self)) {
        console.warn("Translator API not available");
        return "no";
      }

      const availability = await (self as any).Translator.availability({
        sourceLanguage,
        targetLanguage,
      });

      console.log("Translator API availability:", availability);
      return availability;
    } catch (error) {
      console.error("Error checking Translator API availability:", error);
      return "no";
    }
  }

  /**
   * Initialize the Translator API
   */
  async initialize(
    sourceLanguage: string = "en",
    targetLanguage: string = "fr",
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log(
        `Initializing Translator API (${sourceLanguage} → ${targetLanguage})...`
      );

      this.sourceLanguage = sourceLanguage;
      this.targetLanguage = targetLanguage;

      const availability = await this.isAvailable(
        sourceLanguage,
        targetLanguage
      );

      if (availability === "no") {
        throw new Error(
          `Translator API not available for ${sourceLanguage} → ${targetLanguage}`
        );
      }

      // Check if model needs to be downloaded
      // If it's "downloadable" or "downloading", we need a user gesture
      // This typically means onboarding wasn't completed properly
      if (availability === "downloadable" || availability === "downloading") {
        throw new Error(
          `Translator model for ${sourceLanguage} → ${targetLanguage} needs to be downloaded. Please complete onboarding or use a feature that provides user gesture.`
        );
      }

      // At this point, availability should be "readily" - model is already downloaded
      // Create translator
      this.translator = await (self as any).Translator.create({
        sourceLanguage,
        targetLanguage,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progress = (e.loaded / e.total) * 100;
            console.log(`Translator download: ${progress.toFixed(1)}%`);
            onProgress?.(progress);
          });
        },
      });

      console.log("Translator API initialized successfully");
    })();

    return this.initPromise;
  }

  /**
   * Translate text (can be sentence, paragraph, or batch)
   */
  async translateText(text: string): Promise<string> {
    if (!this.translator) {
      throw new Error("Translator API not initialized");
    }

    try {
      console.log(`Translating text (${text.length} chars)...`);
      const translation = await this.translator.translate(text);

      if (!translation || translation.trim().length === 0) {
        console.warn("Empty translation received");
        return "";
      }

      console.log(`Translation received (${translation.length} chars)`);
      return translation.trim();
    } catch (error) {
      console.error("Error translating text:", error);
      throw error;
    }
  }

  /**
   * Get target language code
   */
  getTargetLanguage(): string {
    return this.targetLanguage;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.translator !== null;
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.translator = null;
    this.initPromise = null;
  }
}

export const translatorService = new TranslatorService();
