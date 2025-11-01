import type { SupportedLanguage } from "../utils/translationConfig";

/**
 * Response structure for example sentence generation
 */
interface ExampleSentenceResponse {
  target: string; // Sentence in target language (French/Spanish)
  english: string; // English translation
}

/**
 * Example Sentence Service - Generates contextual example sentences using Prompt API
 */
class ExampleSentenceService {
  private session: any = null;
  private isInitialized = false;

  /**
   * Initialize the Prompt API session
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
      });

      this.isInitialized = true;
      console.log("[ExampleSentenceService] Initialized successfully");
    } catch (error) {
      console.error("[ExampleSentenceService] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Generate a contextual example sentence
   */
  async generateExampleSentence(
    englishWord: string,
    translatedWord: string,
    language: SupportedLanguage,
    pageContext?: string
  ): Promise<ExampleSentenceResponse> {
    if (!this.isInitialized || !this.session) {
      await this.initialize();
    }

    const languageName = language === "french" ? "French" : "Spanish";

    // Build context prompt if page context is provided
    const contextPrompt = pageContext
      ? `The word appears in this context from a web page:
"${pageContext}"

Try to create an example sentence that relates to this context or uses a similar theme.`
      : `Create a general, practical example that would be useful for everyday conversation.`;

    const prompt = `You are a language learning assistant. Generate a simple example sentence using the ${languageName} word "${translatedWord}" (${englishWord} in English).

${contextPrompt}

Requirements:
1. Use A1-A2 level vocabulary (beginner-friendly)
2. Keep the sentence 5-10 words long
3. Make it natural and practical for real-world use
4. Ensure the word "${translatedWord}" is used correctly in context
5. Prefer common, everyday scenarios (food, family, hobbies, daily activities, etc.)

Return ONLY a JSON object with this exact format:
{
  "target": "the example sentence in ${languageName}",
  "english": "the English translation of the sentence"
}

Example format:
{
  "target": "Le chat dort sur le canapé",
  "english": "The cat is sleeping on the couch"
}`;

    try {
      console.log(
        `[ExampleSentenceService] Generating example for "${translatedWord}" (${englishWord})`
      );

      const response = await this.session.prompt(prompt);
      console.log("[ExampleSentenceService] Raw response:", response);

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
      const result: ExampleSentenceResponse = JSON.parse(cleaned);

      // Validate response structure
      if (!result.target || !result.english) {
        throw new Error("Invalid response structure");
      }

      console.log(
        `[ExampleSentenceService] Generated: "${result.target}" → "${result.english}"`
      );

      return result;
    } catch (error) {
      console.error(
        "[ExampleSentenceService] Failed to generate example:",
        error
      );

      // Fallback: Return a simple template
      return {
        target: `Example with "${translatedWord}" unavailable`,
        english: "Could not generate example sentence",
      };
    }
  }

  /**
   * Destroy the session
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
      this.isInitialized = false;
      console.log("[ExampleSentenceService] Session destroyed");
    }
  }
}

export const exampleSentenceService = new ExampleSentenceService();
