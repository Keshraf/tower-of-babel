import type { SupportedLanguage } from "../utils/translationConfig";
import { getLanguageCode } from "../utils/translationConfig";

/**
 * Selection Translation Service - Handles user-initiated text translation
 * Uses Translation API for translation and Rewriter API for simplification
 */
class SelectionTranslationService {
  private translator: any = null;
  private rewriter: any = null;
  private isTranslatorInitialized = false;
  private isRewriterInitialized = false;
  private currentLanguage: SupportedLanguage | null = null;

  /**
   * Initialize the Translation API
   */
  async initializeTranslator(language: SupportedLanguage): Promise<void> {
    // If already initialized for this language, reuse
    if (
      this.isTranslatorInitialized &&
      this.currentLanguage === language &&
      this.translator
    ) {
      console.log(
        "[SelectionTranslationService] Translator already initialized for",
        language
      );
      return;
    }

    // Destroy existing translator if switching languages
    if (this.translator) {
      try {
        this.translator.destroy();
      } catch (error) {
        console.error("Error destroying translator:", error);
      }
      this.translator = null;
      this.isTranslatorInitialized = false;
    }

    try {
      // Check availability
      if (!("Translator" in self)) {
        throw new Error("Translator API not available");
      }

      const languageCode = getLanguageCode(language);
      const availability = await (self as any).Translator.availability({
        sourceLanguage: "en",
        targetLanguage: languageCode,
      });
      console.log(
        "[SelectionTranslationService] Translator availability:",
        availability
      );

      if (availability === "unavailable") {
        throw new Error("Translator API is not available");
      }

      const languageName = language === "french" ? "French" : "Spanish";

      console.log(
        `[SelectionTranslationService] Initializing translator for ${languageName} (${languageCode})`
      );

      // Create translator
      this.translator = await (self as any).Translator.create({
        sourceLanguage: "en",
        targetLanguage: languageCode,
      });

      this.isTranslatorInitialized = true;
      this.currentLanguage = language;

      console.log(
        `[SelectionTranslationService] Translator initialized successfully for ${languageName}`
      );
    } catch (error) {
      console.error(
        "[SelectionTranslationService] Failed to initialize translator:",
        error
      );
      throw error;
    }
  }

  /**
   * Initialize the Rewriter API for simplification
   */
  async initializeRewriter(): Promise<void> {
    if (this.isRewriterInitialized && this.rewriter) {
      console.log(
        "[SelectionTranslationService] Rewriter already initialized"
      );
      return;
    }

    try {
      // Check availability
      if (!("Rewriter" in self)) {
        throw new Error("Rewriter API not available");
      }

      const availability = await (self as any).Rewriter.availability();
      console.log(
        "[SelectionTranslationService] Rewriter availability:",
        availability
      );

      if (availability === "unavailable") {
        throw new Error("Rewriter API is not available");
      }

      console.log("[SelectionTranslationService] Initializing rewriter");

      // Create rewriter for simplification
      this.rewriter = await (self as any).Rewriter.create({
        tone: "more-casual",
        format: "plain-text",
        length: "shorter",
        sharedContext:
          "Simplify English text to make it easier to understand. Use simple words and shorter sentences.",
      });

      this.isRewriterInitialized = true;

      console.log(
        "[SelectionTranslationService] Rewriter initialized successfully"
      );
    } catch (error) {
      console.error(
        "[SelectionTranslationService] Failed to initialize rewriter:",
        error
      );
      throw error;
    }
  }

  /**
   * Simplify English text using Rewriter API
   */
  async simplifyText(text: string): Promise<string> {
    console.log(
      `[SelectionTranslationService] Simplifying: "${text.substring(0, 50)}..."`
    );

    // Initialize rewriter if needed
    if (!this.isRewriterInitialized) {
      await this.initializeRewriter();
    }

    if (!this.rewriter) {
      throw new Error("Rewriter not initialized");
    }

    try {
      const simplified = await this.rewriter.rewrite(text, {
        context: "Simplify this English text to make it easier to understand.",
      });

      console.log(
        `[SelectionTranslationService] Simplified to: "${simplified.substring(0, 50)}..."`
      );

      return simplified.trim();
    } catch (error) {
      console.error(
        "[SelectionTranslationService] Simplification failed:",
        error
      );
      // Return original text if simplification fails
      console.warn(
        "[SelectionTranslationService] Returning original text due to simplification error"
      );
      return text;
    }
  }

  /**
   * Translate text to target language using Translation API
   */
  async translateText(
    text: string,
    language: SupportedLanguage
  ): Promise<string> {
    console.log(
      `[SelectionTranslationService] Translating: "${text.substring(0, 50)}..."`
    );

    // Initialize translator if needed
    if (!this.isTranslatorInitialized || this.currentLanguage !== language) {
      await this.initializeTranslator(language);
    }

    if (!this.translator) {
      throw new Error("Translator not initialized");
    }

    try {
      const translation = await this.translator.translate(text);

      console.log(
        `[SelectionTranslationService] Translated to: "${translation.substring(0, 50)}..."`
      );

      return translation.trim();
    } catch (error) {
      console.error(
        "[SelectionTranslationService] Translation failed:",
        error
      );
      throw error;
    }
  }

  /**
   * Translate selected text (with optional simplification)
   */
  async translateSelectedText(
    text: string,
    language: SupportedLanguage,
    simplify: boolean = false
  ): Promise<string> {
    console.log(
      `[SelectionTranslationService] Processing text (simplify: ${simplify})`
    );

    let textToTranslate = text;

    // Step 1: Simplify if requested
    if (simplify) {
      try {
        textToTranslate = await this.simplifyText(text);
      } catch (error) {
        console.warn(
          "[SelectionTranslationService] Simplification failed, using original text"
        );
        textToTranslate = text;
      }
    }

    // Step 2: Translate
    const translation = await this.translateText(textToTranslate, language);

    return translation;
  }

  /**
   * Check if services are initialized
   */
  isTranslatorReady(): boolean {
    return this.isTranslatorInitialized && this.translator !== null;
  }

  isRewriterReady(): boolean {
    return this.isRewriterInitialized && this.rewriter !== null;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage | null {
    return this.currentLanguage;
  }

  /**
   * Destroy services
   */
  destroy(): void {
    if (this.translator) {
      try {
        this.translator.destroy();
      } catch (error) {
        console.error("[SelectionTranslationService] Error destroying translator:", error);
      }
      this.translator = null;
      this.isTranslatorInitialized = false;
    }

    if (this.rewriter) {
      try {
        this.rewriter.destroy();
      } catch (error) {
        console.error("[SelectionTranslationService] Error destroying rewriter:", error);
      }
      this.rewriter = null;
      this.isRewriterInitialized = false;
    }

    this.currentLanguage = null;
    console.log("[SelectionTranslationService] Destroyed");
  }
}

export const selectionTranslationService = new SelectionTranslationService();
