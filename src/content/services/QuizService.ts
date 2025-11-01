import type { SupportedLanguage } from "../utils/translationConfig";

/**
 * Quiz Service - Generates quiz questions using Prompt API
 */
class QuizService {
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
      console.log("[QuizService] Initialized successfully");
    } catch (error) {
      console.error("[QuizService] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Generate 3 incorrect translation options for multiple choice quiz
   */
  async generateIncorrectOptions(
    correctEnglish: string,
    targetLanguage: SupportedLanguage
  ): Promise<string[]> {
    if (!this.isInitialized || !this.session) {
      await this.initialize();
    }

    const languageName = targetLanguage === "french" ? "French" : "Spanish";

    const prompt = `Given the English word "${correctEnglish}", generate exactly 3 INCORRECT English words that could be confusing alternatives in a ${languageName} language learning quiz.

Requirements:
- Words should be plausible but WRONG
- Words should be similar in meaning, length, or category
- Words should NOT include the correct answer "${correctEnglish}"
- Return ONLY a valid JSON array of 3 strings
- Example format: ["word1", "word2", "word3"]

Generate the 3 incorrect options now:`;

    try {
      const response = await this.session.prompt(prompt);
      console.log("[QuizService] Raw response:", response);

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
      const options = JSON.parse(cleaned);

      if (!Array.isArray(options) || options.length !== 3) {
        throw new Error("Invalid response format");
      }

      // Filter out any options that match the correct answer
      const filtered = options.filter(
        (opt: string) => opt.toLowerCase() !== correctEnglish.toLowerCase()
      );

      // If we lost options due to filtering, generate simple fallbacks
      while (filtered.length < 3) {
        filtered.push(`option${filtered.length + 1}`);
      }

      return filtered.slice(0, 3);
    } catch (error) {
      console.error("[QuizService] Failed to generate options:", error);
      // Fallback options
      return ["option1", "option2", "option3"];
    }
  }

  /**
   * Generate a complete multiple choice question
   */
  async generateMultipleChoiceQuestion(
    englishWord: string,
    translatedWord: string,
    targetLanguage: SupportedLanguage
  ): Promise<{
    question: string;
    options: string[];
    correctAnswer: string;
    correctIndex: number;
  }> {
    // Generate 3 incorrect options
    const incorrectOptions = await this.generateIncorrectOptions(
      englishWord,
      targetLanguage
    );

    // Combine with correct answer and shuffle
    const allOptions = [...incorrectOptions, englishWord];
    const shuffled = this.shuffleArray(allOptions);
    const correctIndex = shuffled.indexOf(englishWord);

    const languageName = targetLanguage === "french" ? "French" : "Spanish";

    return {
      question: `What does "${translatedWord}" mean in English?`,
      options: shuffled,
      correctAnswer: englishWord,
      correctIndex,
    };
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Destroy the session
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
      this.isInitialized = false;
      console.log("[QuizService] Session destroyed");
    }
  }
}

export const quizService = new QuizService();
