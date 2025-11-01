import {
  TranslationConfig,
  getTranslationConfig as loadConfig,
  setTranslationConfig,
  getLanguageCode,
  type SupportedLanguage,
} from "../utils/translationConfig";
import { promptService } from "./PromptService";
import { translatorService } from "./TranslatorService";
import { storageService } from "./StorageService";

/**
 * Main translation service that orchestrates Prompt API and Translator API
 */
class TranslationService {
  private config: TranslationConfig | null = null;
  private currentLanguage: SupportedLanguage | null = null;
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

      const activeLanguage = this.config.activeLanguage;
      this.currentLanguage = activeLanguage;

      // Get language code for Translator API
      const targetLanguageCode = getLanguageCode(activeLanguage);

      try {
        // Initialize Prompt API for word selection
        onProgress?.(0, "Initializing word selection AI...");
        await promptService.initialize(this.config, (progress) => {
          onProgress?.(progress * 0.5, "Loading word selection model...");
        });

        // Initialize Translator API
        onProgress?.(50, "Initializing translator...");
        await translatorService.initialize(
          "en",
          targetLanguageCode,
          (progress) => {
            onProgress?.(
              50 + progress * 0.5,
              "Loading translation model..."
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
   * Switch to a different language
   */
  async switchLanguage(
    newLanguage: SupportedLanguage,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    console.log(
      `Switching language from ${this.currentLanguage} to ${newLanguage}`
    );

    // Update config
    await setTranslationConfig({ activeLanguage: newLanguage });
    this.config = await loadConfig();

    // Reset services
    this.reset();

    // Re-initialize with new language
    this.currentLanguage = newLanguage;
    await this.initialize(onProgress);

    console.log(`Language switched to ${newLanguage} successfully`);
  }

  /**
   * Update configuration and reinitialize services if language changed
   */
  async updateConfig(newConfig: Partial<TranslationConfig>): Promise<void> {
    console.log("Updating translation config:", newConfig);

    const currentLanguage = this.config?.activeLanguage;
    const newLanguage = newConfig.activeLanguage;

    // Save to storage
    await setTranslationConfig(newConfig);

    // If language changed, need to reinitialize
    if (newLanguage && newLanguage !== currentLanguage) {
      await this.switchLanguage(newLanguage);
    } else {
      // Just update config
      this.config = await loadConfig();
    }
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
   * Get current active language
   */
  getCurrentLanguage(): SupportedLanguage {
    if (!this.currentLanguage) {
      throw new Error("Translation service not initialized");
    }
    return this.currentLanguage;
  }

  /**
   * Check if all services are initialized
   */
  isInitialized(): boolean {
    return (
      this.config !== null &&
      this.currentLanguage !== null &&
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
    this.currentLanguage = null;
    this.initPromise = null;
  }
}

export const translationService = new TranslationService();
