import {
  TranslationConfig,
  DENSITY_RATIOS,
  DifficultyLevel,
} from "./translationConfig";

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

export async function createRewriter(
  config: TranslationConfig,
  onProgress?: (progress: number) => void
): Promise<any> {
  const options = {
    sharedContext: `You are helping translate English content to ${config.activeLanguage} for language learners at the ${config.difficulty} level. Maintain context and meaning while choosing appropriate words to translate.`,
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

export async function analyzeAndSelectWords(
  sentence: string,
  config: TranslationConfig
): Promise<string[]> {
  const words = sentence.match(/\b[\w']+\b/g) || [];

  if (words.length === 0) return [];

  const densityRatio = DENSITY_RATIOS[config.density];
  const targetWordCount = Math.max(1, Math.round(words.length / densityRatio));

  const selectedWords = selectWordsByDifficulty(
    words,
    targetWordCount,
    config.difficulty
  );

  return selectedWords;
}

function selectWordsByDifficulty(
  words: string[],
  targetCount: number,
  difficulty: DifficultyLevel
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

  let candidates = words.filter((word) => {
    const lowerWord = word.toLowerCase();
    if (word.length < 3 || commonWords.has(lowerWord)) {
      return false;
    }
    return true;
  });

  const seen = new Set<string>();
  candidates = candidates.filter((word) => {
    const lower = word.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  if (difficulty === "beginner") {
    candidates.sort((a, b) => {
      const scoreA = a.length + (a.match(/ing$|ed$/) ? -2 : 0);
      const scoreB = b.length + (b.match(/ing$|ed$/) ? -2 : 0);
      return scoreA - scoreB;
    });
  } else if (difficulty === "advanced") {
    candidates.sort((a, b) => b.length - a.length);
  }

  return candidates.slice(0, Math.min(targetCount, candidates.length));
}

interface TranslationResult {
  originalWord: string;
  translatedWord: string;
  pronunciation?: string;
}

export async function translateWords(
  sentence: string,
  wordsToTranslate: string[],
  targetLanguage: string,
  rewriter: any
): Promise<Map<string, TranslationResult>> {
  const translations = new Map<string, TranslationResult>();

  if (wordsToTranslate.length === 0) return translations;

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

    const lines = result.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      const match = line.match(/(.+?)\s*->\s*(.+)/);
      if (match) {
        const original = match[1].trim();
        const translated = match[2].trim();

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

export async function translateSentence(
  sentence: string,
  config: TranslationConfig,
  rewriter: any
): Promise<Map<string, TranslationResult>> {
  try {
    const wordsToTranslate = await analyzeAndSelectWords(sentence, config);

    if (wordsToTranslate.length === 0) {
      return new Map();
    }

    const translations = await translateWords(
      sentence,
      wordsToTranslate,
      config.activeLanguage,
      rewriter
    );

    return translations;
  } catch (error) {
    console.error("Error in translation pipeline:", error);
    return new Map();
  }
}
