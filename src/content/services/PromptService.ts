import { TranslationConfig, DENSITY_RATIOS } from "../utils/translationConfig";

/**
 * Service for using Prompt API to intelligently select words to translate
 */
class PromptService {
  private session: any = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Check if Prompt API is available
   */
  async isAvailable(): Promise<string> {
    try {
      if (!("LanguageModel" in self)) {
        console.warn("Prompt API not available");
        return "no";
      }

      const availability = await (self as any).LanguageModel.availability();
      console.log("Prompt API availability:", availability);
      return availability;
    } catch (error) {
      console.error("Error checking Prompt API availability:", error);
      return "no";
    }
  }

  /**
   * Initialize the Prompt API session
   */
  async initialize(
    config: TranslationConfig,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log("Initializing Prompt API...");

      const availability = await this.isAvailable();

      if (availability === "no") {
        throw new Error("Prompt API not available");
      }

      if (availability === "downloading") {
        console.log("Prompt API model downloading...");
      }

      const params = await (self as any).LanguageModel.params();

      this.session = await (self as any).LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progress = (e.loaded / e.total) * 100;
            console.log(`Prompt API download: ${progress.toFixed(1)}%`);
            onProgress?.(progress);
          });
        },
      });

      console.log("Prompt API initialized successfully");
    })();

    return this.initPromise;
  }

  /**
   * Select words to translate from a sentence using Prompt API
   */
  async selectWordsToTranslate(
    sentence: string,
    config: TranslationConfig
  ): Promise<string[]> {
    if (!this.session) {
      throw new Error("Prompt API not initialized");
    }

    // Calculate target word count based on density
    const words = sentence.match(/\b[\w']+\b/g) || [];
    const densityRatio = DENSITY_RATIOS[config.density];
    const targetWordCount = Math.max(
      1,
      Math.round(words.length / densityRatio)
    );

    // Define JSON Schema for structured output
    const schema = {
      type: "object",
      properties: {
        words: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of words to translate",
        },
      },
      required: ["words"],
    };

    // Create prompt based on difficulty level
    const difficultyGuidance = this.getDifficultyGuidance(config.difficulty);

    const prompt = `Analyze this sentence and select exactly ${targetWordCount} words to translate for a ${config.difficulty} level ${config.targetLanguage} learner.

Sentence: "${sentence}"

Selection criteria:
${difficultyGuidance}

Rules:
- Select ONLY words that appear in the sentence
- Do NOT select proper nouns (names, places, brands)
- Do NOT select very common words (the, a, an, is, are, etc.)
- Do NOT select punctuation
- Return words in lowercase
- Select exactly ${targetWordCount} words (or fewer if not enough suitable words exist)

Return a JSON object with a "words" array containing the selected words.`;

    try {
      const result = await this.session.prompt(prompt, {
        responseConstraint: schema,
      });

      const parsed = JSON.parse(result);
      const selectedWords = parsed.words || [];

      console.log(
        `Selected ${selectedWords.length} words from sentence:`,
        selectedWords
      );

      // Validate that selected words actually exist in sentence
      const sentenceLower = sentence.toLowerCase();
      const validWords = selectedWords.filter((word: string) =>
        sentenceLower.includes(word.toLowerCase())
      );

      return validWords;
    } catch (error) {
      console.error("Error selecting words:", error);
      // Fallback to simple selection if Prompt API fails
      return this.fallbackWordSelection(sentence, targetWordCount, config);
    }
  }

  /**
   * Get difficulty-specific guidance for word selection
   */
  private getDifficultyGuidance(difficulty: string): string {
    switch (difficulty) {
      case "beginner":
        return `- Prioritize high-frequency, everyday words
- Focus on simple nouns, verbs, and adjectives
- Choose words that beginners encounter often
- Avoid complex vocabulary and idioms`;

      case "intermediate":
        return `- Select moderately challenging words
- Include phrasal verbs and common expressions
- Choose words with practical usage
- Balance between common and less frequent vocabulary`;

      case "advanced":
        return `- Select sophisticated and nuanced words
- Include advanced vocabulary and technical terms
- Focus on words with subtle meaning differences
- Prioritize complex expressions and idioms`;

      default:
        return "";
    }
  }

  /**
   * Fallback word selection if Prompt API fails
   */
  private fallbackWordSelection(
    sentence: string,
    targetCount: number,
    config: TranslationConfig
  ): string[] {
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "can",
      "may",
      "might",
      "must",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "this",
      "that",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "from",
      "by",
    ]);

    const words = sentence.match(/\b[\w']+\b/g) || [];
    let candidates = words.filter((word) => {
      const lower = word.toLowerCase();
      return word.length >= 3 && !commonWords.has(lower);
    });

    // Remove duplicates
    candidates = Array.from(new Set(candidates.map((w) => w.toLowerCase())));

    // Sort based on difficulty
    if (config.difficulty === "beginner") {
      candidates.sort((a, b) => a.length - b.length);
    } else if (config.difficulty === "advanced") {
      candidates.sort((a, b) => b.length - a.length);
    }

    return candidates.slice(0, targetCount);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.session !== null;
  }

  /**
   * Reset the service
   */
  reset(): void {
    if (this.session) {
      this.session.destroy();
    }
    this.session = null;
    this.initPromise = null;
  }
}

export const promptService = new PromptService();
