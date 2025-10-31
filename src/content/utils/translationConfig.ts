export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type DensityLevel = "low" | "medium" | "high";
export type SupportedLanguage = "french" | "spanish";

/**
 * Language information for supported languages
 */
export interface LanguageInfo {
  code: string; // BCP 47 code for Translator API
  displayName: string; // For UI display
  flag: string; // Emoji flag
}

/**
 * Supported languages configuration
 */
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  french: {
    code: "fr",
    displayName: "French",
    flag: "🇫🇷",
  },
  spanish: {
    code: "es",
    displayName: "Spanish",
    flag: "🇪🇸",
  },
};

/**
 * Translation configuration
 */
export interface TranslationConfig {
  activeLanguage: SupportedLanguage;
  difficulty: DifficultyLevel;
  density: DensityLevel;
  translationEnabled: boolean;
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
  activeLanguage: "french",
  difficulty: "beginner",
  density: "high",
  translationEnabled: true,
};

/**
 * Storage schema for language-specific data
 */
export interface LanguageStats {
  totalWordsEncountered: number;
  totalPagesTranslated: number;
  lastActiveDate: string;
}

export interface WordData {
  english: string;
  translated: string;
  timesEncountered: number;
  firstSeenDate: string;
  lastSeenDate: string;
}

export interface LanguageData {
  stats: LanguageStats;
  words: Record<string, WordData>;
}

// Get configuration from Chrome storage
export async function getTranslationConfig(): Promise<TranslationConfig> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const result = await chrome.storage.local.get("config");
      return result.config || DEFAULT_CONFIG;
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
      await chrome.storage.local.set({ config: newConfig });
      console.log("Translation config saved:", newConfig);
    } catch (error) {
      console.error("Failed to save translation config:", error);
    }
  }
}

// Get language display info
export function getLanguageInfo(language: SupportedLanguage): LanguageInfo {
  return SUPPORTED_LANGUAGES[language];
}

// Get language code for Translator API
export function getLanguageCode(language: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES[language].code;
}
