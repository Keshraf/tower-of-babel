import type { SupportedLanguage } from "../utils/translationConfig";

/**
 * Image Description Service - Uses Prompt API to describe images
 */
class ImageDescriptionService {
  private session: any = null;
  private isInitialized = false;

  /**
   * Initialize the Prompt API session with image input support
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

      // Create session
      this.session = await (self as any).LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        systemPrompt: `You are an image identification assistant. Your task is to identify what you see in an image using ONLY ONE WORD in English.

Rules:
- Use only ONE word (singular noun preferred)
- Use simple, common English words
- Do not be descriptive or use phrases
- Just provide the word that best represents the main subject of the image
- Return ONLY the word, nothing else
- No punctuation, no explanations

Examples:
- Picture of a cat → "cat"
- Image of a mountain → "mountain"
- Photo of a person smiling → "person"
- Drawing of a tree → "tree"`,
      });

      this.isInitialized = true;
      console.log("[ImageDescriptionService] Initialized with image support");
    } catch (error) {
      console.error("[ImageDescriptionService] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Describe an image using one word
   * @param imageUrl - URL of the image or base64 data URL
   * @returns English word describing the image
   */
  async describeImage(imageUrl: string): Promise<string> {
    try {
      // Fetch the image and convert to blob if it's a URL
      let imageBlob: Blob;

      if (imageUrl.startsWith("data:")) {
        // Handle base64 data URLs
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      } else {
        // Handle regular URLs
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      }

      // Create a fresh session for this specific image with multimodal support
      const params = await (self as any).LanguageModel.params();
      const imageSession = await (self as any).LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        initialPrompts: [
          {
            role: "system",
            content: `You are an image identification assistant. Your task is to identify what you see in an image using ONLY ONE WORD in English.

Rules:
- Use only ONE word (singular noun preferred)
- Use simple, common English words
- Do not be descriptive or use phrases
- Just provide the word that best represents the main subject of the image
- Return ONLY the word, nothing else
- No punctuation, no explanations

Examples:
- Picture of a cat → "cat"
- Image of a mountain → "mountain"
- Photo of a person smiling → "person"
- Drawing of a tree → "tree"`,
          },
        ],
        expectedInputs: [{ type: "image" }],
      });

      // Send image to Prompt API with correct multimodal format
      const result = await imageSession.prompt([
        {
          role: "user",
          content: [
            {
              type: "text",
              value:
                "Identify this image using EXACTLY ONE WORD. Only respond with a single English word, nothing else.",
            },
            { type: "image", value: imageBlob },
          ],
        },
      ]);

      // Clean up the session immediately after use
      imageSession.destroy();

      // Clean and validate the response - extract first word only
      const cleaned = result.trim().toLowerCase();

      // Extract just the first word (before any space or punctuation)
      const firstWord = cleaned.split(/[\s.,;:!?]+/)[0].replace(/[^a-z]/g, "");

      if (!firstWord || firstWord.length === 0) {
        console.warn(
          `[ImageDescriptionService] Got invalid response: ${result}`
        );
        throw new Error("Failed to get valid description");
      }

      console.log(
        `[ImageDescriptionService] Image described as: ${firstWord} (from: ${result.substring(
          0,
          50
        )}...)`
      );
      return firstWord;
    } catch (error) {
      console.error(
        "[ImageDescriptionService] Failed to describe image:",
        error
      );
      // Return fallback word
      return "image";
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.isInitialized = false;
    console.log("[ImageDescriptionService] Destroyed");
  }
}

export const imageDescriptionService = new ImageDescriptionService();
