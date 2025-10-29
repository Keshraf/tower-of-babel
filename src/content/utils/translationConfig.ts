// content/utils/translationConfig.ts

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type DensityLevel = "low" | "medium" | "high";

export interface TranslationConfig {
  difficulty: DifficultyLevel;
  density: DensityLevel;
  targetLanguage: string;
}

// Density mapping: determines how many words to translate
// Format: 1 word out of X words
export const DENSITY_RATIOS: Record<DensityLevel, number> = {
  low: 50, // 1 out of 50 words
  medium: 25, // 1 out of 25 words
  high: 20, // 1 out of 20 words
};

// Default configuration
export const DEFAULT_CONFIG: TranslationConfig = {
  difficulty: "beginner",
  density: "high",
  targetLanguage: "French",
};

// Get configuration from Chrome storage
export async function getTranslationConfig(): Promise<TranslationConfig> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const result = await chrome.storage.local.get("translationConfig");
      return result.translationConfig || DEFAULT_CONFIG;
    } catch (error) {
      console.warn("Failed to load translation config from storage:", error);
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

// Save configuration to Chrome storage
export async function setTranslationConfig(
  config: Partial<TranslationConfig>
): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const currentConfig = await getTranslationConfig();
      const newConfig = { ...currentConfig, ...config };
      await chrome.storage.local.set({ translationConfig: newConfig });
    } catch (error) {
      console.error("Failed to save translation config:", error);
    }
  }
}

// Prompts for different difficulty levels
export const DIFFICULTY_PROMPTS: Record<DifficultyLevel, string> = {
  beginner: `You are helping a beginner language learner. In the given sentence, select simple, common words that beginners should learn first. Focus on:
- High-frequency everyday words
- Simple verbs, nouns, and adjectives
- Basic vocabulary items
Return ONLY the words that should be translated, separated by commas.`,

  intermediate: `You are helping an intermediate language learner. In the given sentence, select moderately challenging words. Focus on:
- Less common but still useful vocabulary
- Phrasal verbs and idiomatic expressions
- Words with multiple meanings
Return ONLY the words that should be translated, separated by commas.`,

  advanced: `You are helping an advanced language learner. In the given sentence, select sophisticated and nuanced words. Focus on:
- Advanced vocabulary and technical terms
- Subtle distinctions in meaning
- Complex idiomatic expressions
Return ONLY the words that should be translated, separated by commas.`,
};
