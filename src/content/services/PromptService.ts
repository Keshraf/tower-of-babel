import { TranslationConfig, DENSITY_RATIOS } from "../utils/translationConfig";

/**
 * Simple word pair without position information
 */
export interface WordPair {
  original: string;
  translated: string;
}

/**
 * Response from Prompt API with word pairs
 */
interface WordPairResponse {
  words: WordPair[];
}

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
   * NEW: Select words from text batch (no position tracking)
   */
  async selectWordsFromBatch(
    originalText: string,
    translatedText: string,
    config: TranslationConfig
  ): Promise<WordPair[]> {
    if (!this.session) {
      throw new Error("Prompt API not initialized");
    }

    // Calculate target word count based on density
    const words = originalText.match(/\b[\w']+\b/g) || [];
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
            type: "object",
            properties: {
              original: {
                type: "string",
                description: "The English word to translate",
              },
              translated: {
                type: "string",
                description: "The French translation",
              },
            },
            required: ["original", "translated"],
          },
        },
      },
      required: ["words"],
    };

    // Get difficulty-specific guidance
    const difficultyGuidance = this.getDifficultyGuidance(config.difficulty);

    const prompt = `You are helping a ${config.difficulty} level ${config.activeLanguage} learner select words to practice.

ORIGINAL ENGLISH TEXT:
"${originalText}"

FRENCH TRANSLATION:
"${translatedText}"

TASK: Select EXACTLY ${targetWordCount} words from the ORIGINAL English text that should be translated for learning.

SELECTION CRITERIA:
${difficultyGuidance}

RULES:
1. Select ONLY words that appear in the original English text
2. Do NOT select proper nouns (names, places, brands)
3. Do NOT select very common words (the, a, an, is, are, was, were, be, been, have, has, had, do, does, did, will, would, shall, should, can, could, may, might, must, etc.)
4. Do NOT select punctuation or articles
5. Match each English word with its corresponding ${config.activeLanguage} translation
6. Return words in lowercase
7. You MUST select exactly ${targetWordCount} words - this is critical for the learning experience
8. Prefer nouns, verbs, adjectives, and adverbs - these are valuable for learning

IMPORTANT:
- Prioritize selecting the full ${targetWordCount} words
- Include common everyday words that are useful for learners (like food items, actions, descriptive words)
- We will replace ALL occurrences of each word in the text

Return a JSON object with a "words" array containing exactly ${targetWordCount} word pairs.

Example format:
{
  "words": [
    {"original": "cat", "translated": "chat"},
    {"original": "house", "translated": "maison"}
  ]
}`;

    try {
      console.log(`[PromptService] Target: ${targetWordCount} words from ${words.length} total words (density: ${config.density})`);

      const result = await this.session.prompt(prompt, {
        responseConstraint: schema,
      });

      const parsed: WordPairResponse = JSON.parse(result);
      const wordPairs = parsed.words || [];

      console.log(`[PromptService] AI selected ${wordPairs.length}/${targetWordCount} word pairs`);

      // Validate that words exist in original text
      const validPairs = this.validateWordPairs(wordPairs, originalText);

      console.log(`[PromptService] After validation: ${validPairs.length} valid word pairs`);

      // Log warning if we got significantly fewer words than requested
      if (validPairs.length < targetWordCount * 0.7) {
        console.warn(`[PromptService] Low word count: ${validPairs.length}/${targetWordCount} (${Math.round(validPairs.length/targetWordCount*100)}%)`);
      }

      return validPairs;
    } catch (error) {
      console.error("[PromptService] Error selecting words from batch:", error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Validate that word pairs actually exist in the original text
   */
  private validateWordPairs(
    pairs: WordPair[],
    originalText: string
  ): WordPair[] {
    const lowerOriginal = originalText.toLowerCase();

    return pairs.filter((pair) => {
      const wordRegex = new RegExp(`\\b${pair.original.toLowerCase()}\\b`);
      const exists = wordRegex.test(lowerOriginal);

      if (!exists) {
        console.warn(`Word "${pair.original}" not found in text, skipping`);
      }

      return exists;
    });
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
