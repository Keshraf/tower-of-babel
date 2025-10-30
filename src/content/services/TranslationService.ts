import {
  TranslationConfig,
  getTranslationConfig as loadConfig,
} from "../utils/translationConfig";
import { createRewriter, isRewriterAvailable } from "../utils/rewriterAPI";

class TranslationService {
  private rewriter: any = null;
  private config: TranslationConfig | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the translation service
   * This can be called multiple times safely - it will only initialize once
   */
  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    // Return existing initialization if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log("Initializing translation service...");

      // Check if Rewriter API is available
      const availability = await isRewriterAvailable();

      if (availability === "no") {
        throw new Error(
          "Rewriter API not available. Make sure Chrome Built-in AI is enabled."
        );
      }

      // Load configuration
      this.config = await loadConfig();
      console.log("Translation config loaded:", this.config);

      // Create rewriter instance
      if (availability === "available") {
        console.log("Rewriter is ready to use immediately!");
      } else {
        console.log(
          "Rewriter model will be downloaded. This may take a few minutes..."
        );
      }

      this.rewriter = await createRewriter(this.config, (progress) => {
        console.log(`Download progress: ${progress.toFixed(1)}%`);
        onProgress?.(progress);
      });

      console.log("Translation service initialized successfully");
    })();

    return this.initPromise;
  }

  /**
   * Get the rewriter instance
   * Throws if not initialized
   */
  getRewriter(): any {
    if (!this.rewriter) {
      throw new Error(
        "Translation service not initialized. Call initialize() first."
      );
    }
    return this.rewriter;
  }

  /**
   * Get the current configuration
   * Throws if not initialized
   */
  getConfig(): TranslationConfig {
    if (!this.config) {
      throw new Error(
        "Translation service not initialized. Call initialize() first."
      );
    }
    return this.config;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.rewriter !== null && this.config !== null;
  }

  /**
   * Reset the service (useful for testing or config changes)
   */
  reset(): void {
    this.rewriter = null;
    this.config = null;
    this.initPromise = null;
  }
}

// Singleton instance
export const translationService = new TranslationService();
