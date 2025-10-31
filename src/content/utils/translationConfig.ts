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
      console.log("Translation config saved:", newConfig);
    } catch (error) {
      console.error("Failed to save translation config:", error);
    }
  }
}
