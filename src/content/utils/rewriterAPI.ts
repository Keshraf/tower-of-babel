// content/utils/rewriterAPI.ts

import {
  TranslationConfig,
  DENSITY_RATIOS,
  DifficultyLevel,
} from "./translationConfig";

// Check if Rewriter API is available
export async function isRewriterAvailable(): Promise<string> {
  try {
    if (!("Rewriter" in self)) {
      console.warn("Rewriter API not available");
      return "no";
    }
    const availability = await (self as any).Rewriter.availability();
    console.log("Rewriter availability:", availability);
    return availability;
  } catch (error) {
    console.error("Error checking Rewriter availability:", error);
    return "no";
  }
}

// Create a rewriter instance with download monitoring
export async function createRewriter(
  config: TranslationConfig,
  onProgress?: (progress: number) => void
): Promise<any> {
  const options = {
    sharedContext: `You are helping translate English content to ${config.targetLanguage} for language learners at the ${config.difficulty} level. Maintain context and meaning while choosing appropriate words to translate.`,
    tone: "as-is" as const,
    format: "plain-text" as const,
    length: "as-is" as const,
    expectedInputLanguage: ["en"],
    outputLanguage: "es",
    monitor(m: any) {
      m.addEventListener("downloadprogress", (e: any) => {
        const progress = (e.loaded / e.total) * 100;
        console.log(`Rewriter model download: ${progress.toFixed(1)}%`);
        onProgress?.(progress);
      });
    },
  };

  try {
    console.log("Creating rewriter with options:", options);
    const rewriter = await (self as any).Rewriter.create(options);
    console.log("Rewriter created successfully:", rewriter);
    return rewriter;
  } catch (error) {
    console.error("Failed to create rewriter:", error);
    console.error(
      "Make sure Chrome Built-in AI is enabled at chrome://flags/#optimization-guide-on-device-model"
    );
    throw error;
  }
}

// Analyze sentence and determine which words to translate based on difficulty and density
export async function analyzeAndSelectWords(
  sentence: string,
  config: TranslationConfig
): Promise<string[]> {
  // Split sentence into words (preserve punctuation separately)
  const words = sentence.match(/\b[\w']+\b/g) || [];

  if (words.length === 0) return [];

  // Calculate how many words to translate based on density
  const densityRatio = DENSITY_RATIOS[config.density];
  const targetWordCount = Math.max(1, Math.round(words.length / densityRatio));

  // For now, use a simplified selection strategy
  // In production, you might use the Prompt API or another AI service to select words
  const selectedWords = selectWordsByDifficulty(
    words,
    targetWordCount,
    config.difficulty
  );

  return selectedWords;
}

// Simple word selection based on difficulty (can be enhanced with AI)
function selectWordsByDifficulty(
  words: string[],
  targetCount: number,
  difficulty: DifficultyLevel
): string[] {
  // Common beginner words to prioritize or avoid
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
    "shall",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "from",
    "by",
    "about",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "up",
    "down",
    "out",
    "off",
  ]);

  // Filter out very common function words and short words
  let candidates = words.filter((word) => {
    const lowerWord = word.toLowerCase();

    // Skip very short words and common function words for all levels
    if (word.length < 3 || commonWords.has(lowerWord)) {
      return false;
    }

    return true;
  });

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  candidates = candidates.filter((word) => {
    const lower = word.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  // Select words based on difficulty
  if (difficulty === "beginner") {
    // Prefer common, shorter words for beginners
    candidates.sort((a, b) => {
      // Prioritize shorter words and common patterns
      const scoreA = a.length + (a.match(/ing$|ed$/) ? -2 : 0);
      const scoreB = b.length + (b.match(/ing$|ed$/) ? -2 : 0);
      return scoreA - scoreB;
    });
  } else if (difficulty === "advanced") {
    // Prefer longer, more complex words for advanced
    candidates.sort((a, b) => b.length - a.length);
  }
  // For intermediate, keep natural order

  // Return the target number of words, but ensure we don't exceed available candidates
  return candidates.slice(0, Math.min(targetCount, candidates.length));
}

interface TranslationResult {
  originalWord: string;
  translatedWord: string;
  pronunciation?: string;
}

// Translate selected words using Rewriter API
export async function translateWords(
  sentence: string,
  wordsToTranslate: string[],
  targetLanguage: string,
  rewriter: any
): Promise<Map<string, TranslationResult>> {
  const translations = new Map<string, TranslationResult>();

  if (wordsToTranslate.length === 0) return translations;

  // Create a prompt to translate specific words in context
  const prompt = `Given this sentence: "${sentence}"

Translate these specific words to ${targetLanguage}: ${wordsToTranslate.join(
    ", "
  )}

For each word, provide the translation in this exact format:
[original word] -> [${targetLanguage} translation]

Keep translations as single words when possible. Maintain context from the sentence.`;

  try {
    const result = await rewriter.rewrite(prompt, {
      context: `Translate only the specified words to ${targetLanguage}, preserving their meaning in context.`,
    });

    // Parse the result to extract translations
    const lines = result.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      const match = line.match(/(.+?)\s*->\s*(.+)/);
      if (match) {
        const original = match[1].trim();
        const translated = match[2].trim();

        // Find which word this corresponds to
        const originalWord = wordsToTranslate.find((w) =>
          original.toLowerCase().includes(w.toLowerCase())
        );

        if (originalWord) {
          translations.set(originalWord.toLowerCase(), {
            originalWord,
            translatedWord: translated,
          });
        }
      }
    }
  } catch (error) {
    console.error("Translation failed:", error);
  }

  return translations;
}

// Main translation pipeline
export async function translateSentence(
  sentence: string,
  config: TranslationConfig,
  rewriter: any
): Promise<Map<string, TranslationResult>> {
  try {
    // Step 1: Analyze and select words to translate
    const wordsToTranslate = await analyzeAndSelectWords(sentence, config);

    if (wordsToTranslate.length === 0) {
      return new Map();
    }

    // Step 2: Translate selected words using context
    const translations = await translateWords(
      sentence,
      wordsToTranslate,
      config.targetLanguage,
      rewriter
    );

    return translations;
  } catch (error) {
    console.error("Error in translation pipeline:", error);
    return new Map();
  }
}
