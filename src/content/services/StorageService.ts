import type {
  SupportedLanguage,
  LanguageStats,
  WordData,
  LanguageData,
  DifficultyLevel,
  DensityLevel,
  TranslationConfig,
} from "../utils/translationConfig";

/**
 * Service for managing language-specific storage
 */
class StorageService {
  /**
   * Get full config
   */
  async getConfig(): Promise<TranslationConfig> {
    try {
      const result = await chrome.storage.local.get("config");
      return (
        result.config || {
          activeLanguage: "french",
          difficulty: "beginner",
          density: "high",
          translationEnabled: true,
        }
      );
    } catch (error) {
      console.error("Error getting config:", error);
      return {
        activeLanguage: "french",
        difficulty: "beginner",
        density: "high",
        translationEnabled: true,
      };
    }
  }

  /**
   * Update config (partial update)
   */
  async updateConfig(updates: Partial<TranslationConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      await chrome.storage.local.set({ config: newConfig });
      console.log("Config updated:", newConfig);
    } catch (error) {
      console.error("Error updating config:", error);
    }
  }

  /**
   * Get active language from config
   */
  async getActiveLanguage(): Promise<SupportedLanguage> {
    try {
      const config = await this.getConfig();
      return config.activeLanguage || "french";
    } catch (error) {
      console.error("Error getting active language:", error);
      return "french";
    }
  }

  /**
   * Set active language in config
   */
  async setActiveLanguage(language: SupportedLanguage): Promise<void> {
    await this.updateConfig({ activeLanguage: language });
  }

  /**
   * Get difficulty level
   */
  async getDifficulty(): Promise<DifficultyLevel> {
    try {
      const config = await this.getConfig();
      return config.difficulty || "beginner";
    } catch (error) {
      console.error("Error getting difficulty:", error);
      return "beginner";
    }
  }

  /**
   * Set difficulty level
   */
  async setDifficulty(difficulty: DifficultyLevel): Promise<void> {
    await this.updateConfig({ difficulty });
  }

  /**
   * Get density level
   */
  async getDensity(): Promise<DensityLevel> {
    try {
      const config = await this.getConfig();
      return config.density || "high";
    } catch (error) {
      console.error("Error getting density:", error);
      return "high";
    }
  }

  /**
   * Set density level
   */
  async setDensity(density: DensityLevel): Promise<void> {
    await this.updateConfig({ density });
  }

  /**
   * Get translation enabled state
   */
  async getTranslationEnabled(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      return config.translationEnabled !== false;
    } catch (error) {
      console.error("Error getting translation enabled:", error);
      return true;
    }
  }

  /**
   * Set translation enabled state
   */
  async setTranslationEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ translationEnabled: enabled });
  }

  /**
   * Get stats for a specific language
   */
  async getStats(language: SupportedLanguage): Promise<LanguageStats> {
    try {
      const result = await chrome.storage.local.get("languages");
      const languages = result.languages || {};

      if (!languages[language] || !languages[language].stats) {
        return {
          totalWordsEncountered: 0,
          totalPagesTranslated: 0,
          lastActiveDate: new Date().toISOString(),
        };
      }

      return languages[language].stats;
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalWordsEncountered: 0,
        totalPagesTranslated: 0,
        lastActiveDate: new Date().toISOString(),
      };
    }
  }

  /**
   * Update stats for a specific language
   */
  async updateStats(
    language: SupportedLanguage,
    updates: Partial<LanguageStats>
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get("languages");
      const languages = result.languages || {};

      if (!languages[language]) {
        languages[language] = {
          stats: {
            totalWordsEncountered: 0,
            totalPagesTranslated: 0,
            lastActiveDate: new Date().toISOString(),
          },
          words: {},
        };
      }

      // Update stats
      languages[language].stats = {
        ...languages[language].stats,
        ...updates,
        lastActiveDate: new Date().toISOString(),
      };

      await chrome.storage.local.set({ languages });
      console.log(`Stats updated for ${language}:`, languages[language].stats);
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  }

  /**
   * Increment a stat counter for a specific language
   */
  async incrementStat(
    language: SupportedLanguage,
    field: keyof LanguageStats
  ): Promise<void> {
    try {
      const stats = await this.getStats(language);
      const currentValue = stats[field];

      if (typeof currentValue === "number") {
        await this.updateStats(language, {
          [field]: currentValue + 1,
        });
      }
    } catch (error) {
      console.error("Error incrementing stat:", error);
    }
  }

  /**
   * Get word history for a specific language
   */
  async getWords(
    language: SupportedLanguage
  ): Promise<Record<string, WordData>> {
    try {
      const result = await chrome.storage.local.get("languages");
      const languages = result.languages || {};

      if (!languages[language] || !languages[language].words) {
        return {};
      }

      return languages[language].words;
    } catch (error) {
      console.error("Error getting words:", error);
      return {};
    }
  }

  /**
   * Get a specific word from history
   */
  async getWord(
    language: SupportedLanguage,
    wordId: string
  ): Promise<WordData | null> {
    try {
      const words = await this.getWords(language);
      return words[wordId] || null;
    } catch (error) {
      console.error("Error getting word:", error);
      return null;
    }
  }

  /**
   * Save or update a word in history
   */
  async saveWord(
    language: SupportedLanguage,
    wordId: string,
    wordData: WordData
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get("languages");
      const languages = result.languages || {};

      if (!languages[language]) {
        languages[language] = {
          stats: {
            totalWordsEncountered: 0,
            totalPagesTranslated: 0,
            lastActiveDate: new Date().toISOString(),
          },
          words: {},
        };
      }

      // Update word
      languages[language].words[wordId] = {
        ...wordData,
        lastSeenDate: new Date().toISOString(),
      };

      await chrome.storage.local.set({ languages });
    } catch (error) {
      console.error("Error saving word:", error);
    }
  }

  /**
   * Record a word encounter (increment or create)
   * This is called every time a word is translated on the page
   */
  async recordWordEncounter(
    language: SupportedLanguage,
    english: string,
    translated: string
  ): Promise<void> {
    try {
      const wordId = english.toLowerCase();
      const existingWord = await this.getWord(language, wordId);

      if (existingWord) {
        // Word exists, increment counter
        await this.saveWord(language, wordId, {
          ...existingWord,
          timesEncountered: existingWord.timesEncountered + 1,
          lastSeenDate: new Date().toISOString(),
        });
      } else {
        // New word
        await this.saveWord(language, wordId, {
          english,
          translated,
          timesEncountered: 1,
          firstSeenDate: new Date().toISOString(),
          lastSeenDate: new Date().toISOString(),
        });

        // Increment total words encountered (only for new words)
        await this.incrementStat(language, "totalWordsEncountered");
      }
    } catch (error) {
      console.error("Error recording word encounter:", error);
    }
  }

  /**
   * Check if models are downloaded for a language
   */
  async isLanguageDownloaded(language: SupportedLanguage): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get("system");
      const system = result.system || {};
      const modelsDownloaded = system.modelsDownloaded || {};
      return modelsDownloaded[language] || false;
    } catch (error) {
      console.error("Error checking language download:", error);
      return false;
    }
  }

  /**
   * Mark a language as downloaded
   */
  async setLanguageDownloaded(language: SupportedLanguage): Promise<void> {
    try {
      const result = await chrome.storage.local.get("system");
      const system = result.system || {};
      const modelsDownloaded = system.modelsDownloaded || {};

      modelsDownloaded[language] = true;
      system.modelsDownloaded = modelsDownloaded;

      await chrome.storage.local.set({ system });
      console.log(`Language marked as downloaded: ${language}`);
    } catch (error) {
      console.error("Error setting language downloaded:", error);
    }
  }

  /**
   * Get all downloaded languages
   */
  async getDownloadedLanguages(): Promise<SupportedLanguage[]> {
    try {
      const result = await chrome.storage.local.get("system");
      const system = result.system || {};
      const modelsDownloaded = system.modelsDownloaded || {};

      return Object.keys(modelsDownloaded).filter(
        (lang) => modelsDownloaded[lang]
      ) as SupportedLanguage[];
    } catch (error) {
      console.error("Error getting downloaded languages:", error);
      return [];
    }
  }
}

export const storageService = new StorageService();
