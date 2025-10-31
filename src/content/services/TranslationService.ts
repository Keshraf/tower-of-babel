import {
  TranslationConfig,
  getTranslationConfig as loadConfig,
  setTranslationConfig,
} from "../utils/translationConfig";
import { promptService } from "./PromptService";
import { translatorService } from "./TranslatorService";

/**
 * Main translation service that orchestrates Prompt API and Translator API
 */
class TranslationService {
  private config: TranslationConfig | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize both Prompt API and Translator API
   */
  async initialize(
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log("Initializing translation services...");

      // Load configuration
      this.config = await loadConfig();
      console.log("Translation config loaded:", this.config);

      // Get target language code (default to 'fr' for French)
      const targetLanguageCode = this.getLanguageCode(
        this.config.targetLanguage
      );

      try {
        // Initialize Prompt API for word selection
        onProgress?.(0, "Initializing word selection AI...");
        await promptService.initialize(this.config, (progress) => {
          onProgress?.(progress * 0.5, "Downloading word selection model...");
        });

        // Initialize Translator API
        onProgress?.(50, "Initializing translator...");
        await translatorService.initialize(
          "en",
          targetLanguageCode,
          (progress) => {
            onProgress?.(
              50 + progress * 0.5,
              "Downloading translation model..."
            );
          }
        );

        onProgress?.(100, "Ready!");
        console.log("All translation services initialized successfully");
      } catch (error) {
        console.error("Failed to initialize translation services:", error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Convert language name to BCP 47 code
   */
  private getLanguageCode(languageName: string): string {
    const languageCodes: Record<string, string> = {
      french: "fr",
      spanish: "es",
      german: "de",
      italian: "it",
      portuguese: "pt",
      japanese: "ja",
    };

    const normalized = languageName.toLowerCase();
    return languageCodes[normalized] || "fr"; // Default to French
  }

  /**
   * Update configuration and reinitialize services
   */
  async updateConfig(newConfig: Partial<TranslationConfig>): Promise<void> {
    console.log("Updating translation config:", newConfig);

    // Save to storage
    await setTranslationConfig(newConfig);

    // Reset and reinitialize
    this.reset();
    await this.initialize();
  }

  /**
   * Get the Prompt service
   */
  getPromptService() {
    if (!promptService.isInitialized()) {
      throw new Error("Prompt service not initialized");
    }
    return promptService;
  }

  /**
   * Get the Translator service
   */
  getTranslatorService() {
    if (!translatorService.isInitialized()) {
      throw new Error("Translator service not initialized");
    }
    return translatorService;
  }

  /**
   * Get current configuration
   */
  getConfig(): TranslationConfig {
    if (!this.config) {
      throw new Error("Translation service not initialized");
    }
    return this.config;
  }

  /**
   * Check if all services are initialized
   */
  isInitialized(): boolean {
    return (
      this.config !== null &&
      promptService.isInitialized() &&
      translatorService.isInitialized()
    );
  }

  /**
   * Reset all services
   */
  reset(): void {
    promptService.reset();
    translatorService.reset();
    this.config = null;
    this.initPromise = null;
  }
}

export const translationService = new TranslationService();
