import type { SupportedLanguage } from "../utils/translationConfig";
import { getLanguageCode } from "../utils/translationConfig";

/**
 * Rewriter Translation Service - Uses Rewriter API for user-initiated translation
 */
class RewriterTranslationService {
  private rewriter: any = null;
  private isInitialized = false;
  private currentLanguage: SupportedLanguage | null = null;

  /**
   * Initialize the Rewriter API for translation
   */
  async initialize(
    language: SupportedLanguage,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // If already initialized for this language, reuse
    if (this.isInitialized && this.currentLanguage === language) {
      console.log(
        "[RewriterTranslationService] Already initialized for",
        language
      );
      return;
    }

    // Destroy existing rewriter if switching languages
    if (this.rewriter) {
      this.destroy();
    }

    try {
      // Check availability
      if (!("Rewriter" in self)) {
        throw new Error("Rewriter API not available");
      }

      const availability = await (self as any).Rewriter.availability();
      console.log("[RewriterTranslationService] Availability:", availability);

      if (availability === "unavailable") {
        throw new Error("Rewriter API is not available");
      }

      // Get language code for output
      const languageCode = getLanguageCode(language);
      const languageName = language === "french" ? "French" : "Spanish";

      console.log(
        `[RewriterTranslationService] Initializing for ${languageName} (${languageCode})`
      );

      // Create rewriter with translation configuration
      this.rewriter = await (self as any).Rewriter.create({
        outputLanguage: languageCode,
        tone: "as-is",
        format: "plain-text",
        length: "as-is",
        sharedContext: `Translate English text naturally to ${languageName}. Maintain the original meaning and context.`,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progress = (e.loaded / e.total) * 100;
            console.log(
              `[RewriterTranslationService] Download: ${progress.toFixed(1)}%`
            );
            onProgress?.(progress);
          });
        },
      });

      this.isInitialized = true;
      this.currentLanguage = language;

      console.log(
        `[RewriterTranslationService] Initialized successfully for ${languageName}`
      );
    } catch (error) {
      console.error(
        "[RewriterTranslationService] Failed to initialize:",
        error
      );
      throw error;
    }
  }

  /**
   * Translate selected text to target language
   */
  async translateSelectedText(
    text: string,
    language: SupportedLanguage
  ): Promise<string> {
    console.log(
      `[RewriterTranslationService] Translating: "${text.substring(0, 50)}..."`
    );

    // Initialize if needed
    if (!this.isInitialized || this.currentLanguage !== language) {
      console.log("[RewriterTranslationService] Initializing for translation");
      await this.initialize(language);
    }

    if (!this.rewriter) {
      throw new Error("Rewriter not initialized");
    }

    try {
      // Use rewrite() for request-based (non-streaming) translation
      const translation = await this.rewriter.rewrite(text, {
        context: `Translate this English text to ${language} naturally, maintaining the original meaning.`,
      });

      console.log(
        `[RewriterTranslationService] Translated to: "${translation.substring(0, 50)}..."`
      );

      return translation.trim();
    } catch (error) {
      console.error(
        "[RewriterTranslationService] Translation failed:",
        error
      );
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.rewriter !== null;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage | null {
    return this.currentLanguage;
  }

  /**
   * Destroy the rewriter
   */
  destroy(): void {
    if (this.rewriter) {
      try {
        this.rewriter.destroy();
      } catch (error) {
        console.error(
          "[RewriterTranslationService] Error destroying rewriter:",
          error
        );
      }
      this.rewriter = null;
      this.isInitialized = false;
      this.currentLanguage = null;
      console.log("[RewriterTranslationService] Destroyed");
    }
  }
}

export const rewriterTranslationService = new RewriterTranslationService();
