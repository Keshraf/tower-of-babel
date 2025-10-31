interface TranslationResult {
  originalWord: string;
  translatedWord: string;
}

/**
 * Service for translating words using Translator API
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
   * Translate a single word in context
   */
  async translateWord(
    word: string,
    context: string
  ): Promise<TranslationResult> {
    if (!this.translator) {
      throw new Error("Translator API not initialized");
    }

    try {
      // Translate the word
      const translatedWord = await this.translator.translate(word);

      return {
        originalWord: word,
        translatedWord: translatedWord.trim(),
      };
    } catch (error) {
      console.error(`Error translating word "${word}":`, error);
      throw error;
    }
  }

  /**
   * Translate multiple words in context (batched)
   * Note: Translator API processes sequentially, but we batch for efficiency
   */
  async translateWords(
    words: string[],
    context: string
  ): Promise<Map<string, TranslationResult>> {
    const translations = new Map<string, TranslationResult>();

    if (words.length === 0) {
      return translations;
    }

    console.log(`Translating ${words.length} words:`, words);

    // Process translations sequentially (Translator API requirement)
    for (const word of words) {
      try {
        const result = await this.translateWord(word, context);
        translations.set(word.toLowerCase(), result);
      } catch (error) {
        console.error(`Failed to translate "${word}":`, error);
        // Continue with other words even if one fails
      }
    }

    console.log(`Successfully translated ${translations.size} words`);
    return translations;
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
