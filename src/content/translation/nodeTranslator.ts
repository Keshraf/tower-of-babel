import { translationService } from "../services/TranslationService";
import { type SentenceBatch, type SentenceInfo } from "../utils/textExtraction";
import { translationState } from "./translationState";
import type { WordPair } from "../services/PromptService";

interface WordData {
  english: string;
  french: string;
}

interface TooltipHandler {
  show: (data: WordData, x: number, y: number) => void;
  hide: () => void;
}

// Store tooltip handler so DOM event handlers can access it
let tooltipHandler: TooltipHandler | null = null;

/**
 * Set the tooltip handler from React context
 */
export function setTooltipHandler(handler: TooltipHandler): void {
  tooltipHandler = handler;
}

/**
 * NEW: Translate and replace sentence batches using regex
 */
export async function translateAndReplaceBatches(
  batches: SentenceBatch[]
): Promise<void> {
  console.log(`Processing ${batches.length} sentence batches`);

  if (!translationService.isInitialized()) {
    console.warn("Translation service not initialized, skipping translation");
    return;
  }

  // Check if translation is still active
  if (!translationState.shouldContinue()) {
    console.log("Translation cancelled, skipping batch processing");
    return;
  }

  const promptService = translationService.getPromptService();
  const translatorService = translationService.getTranslatorService();
  const config = translationService.getConfig();

  // Process each batch
  for (const batch of batches) {
    // Check if we should continue before each batch
    if (!translationState.shouldContinue()) {
      console.log("Translation cancelled mid-processing");
      return;
    }

    try {
      await processBatch(batch, promptService, translatorService, config);
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Batch processing aborted");
        return;
      }
      console.error("Error processing batch:", error);
      // Continue with next batch even if one fails
    }
  }
}

/**
 * Process a single batch: translate and select words
 */
async function processBatch(
  batch: SentenceBatch,
  promptService: any,
  translatorService: any,
  config: any
): Promise<void> {
  const { combinedText, sentences } = batch;

  console.log(
    `Processing batch with ${sentences.length} sentences (${combinedText.length} chars)...`
  );

  // Check if still active
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 1: Translate entire batch
  const translatedText = await translatorService.translateText(combinedText);

  if (!translatedText || translatedText.trim().length === 0) {
    console.warn("Empty translation, skipping batch");
    return;
  }

  console.log("Translation complete, selecting words...");

  // Check again before word selection
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 2: Use Prompt API to select words (no positions needed)
  const wordPairs = await promptService.selectWordsFromBatch(
    combinedText,
    translatedText,
    config
  );

  if (wordPairs.length === 0) {
    console.log("No words selected for this batch");
    return;
  }

  console.log(`Selected ${wordPairs.length} word pairs for translation`);

  // Check one more time before DOM manipulation
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 3: For each sentence in batch, replace words using regex
  sentences.forEach((sentence) => {
    replaceWordsInSentence(sentence, wordPairs);
  });
}

/**
 * Replace words in a sentence using regex (finds all occurrences)
 */
function replaceWordsInSentence(
  sentence: SentenceInfo,
  wordPairs: WordPair[]
): void {
  const { node } = sentence;

  // Process each word pair
  wordPairs.forEach((pair) => {
    try {
      replaceWordInNode(node, pair.original, pair.translated);
    } catch (error) {
      console.error(
        `Error replacing word "${pair.original}" in sentence:`,
        error
      );
    }
  });
}

/**
 * Replace all occurrences of a word in a text node using regex
 */
function replaceWordInNode(
  node: Text,
  originalWord: string,
  translatedWord: string
): void {
  if (!node.textContent) return;

  const text = node.textContent;

  // Create regex to find word with word boundaries (case-insensitive)
  const wordRegex = new RegExp(`\\b${escapeRegex(originalWord)}\\b`, "gi");

  // Check if word exists in this node
  if (!wordRegex.test(text)) {
    return; // Word not in this node
  }

  // Reset regex
  wordRegex.lastIndex = 0;

  // Find all matches with their positions
  const matches: Array<{ index: number; word: string }> = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      word: match[0], // Actual matched text (preserves original case)
    });
  }

  if (matches.length === 0) return;

  // Build new DOM structure with translated words
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  matches.forEach((match) => {
    // Add text before the match
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex, match.index))
      );
    }

    // Preserve capitalization from original
    const translatedWithCase = preserveCapitalization(
      match.word,
      translatedWord
    );

    // Create span for translated word
    const span = createTranslatedWordSpan(match.word, translatedWithCase);
    fragment.appendChild(span);

    lastIndex = match.index + match.word.length;
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
  }

  // Replace the original text node with the fragment
  node.parentNode?.replaceChild(fragment, node);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Preserve capitalization from original word
 */
function preserveCapitalization(original: string, translated: string): string {
  if (original.length === 0 || translated.length === 0) {
    return translated;
  }

  // If entire word is uppercase
  if (original === original.toUpperCase()) {
    return translated.toUpperCase();
  }

  // If first letter is uppercase
  if (original[0] === original[0].toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  // Otherwise keep as-is
  return translated;
}

/**
 * Create a span element for a translated word with hover functionality
 */
function createTranslatedWordSpan(
  originalWord: string,
  translatedWord: string
): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = translatedWord;
  span.className = "translated-word";
  span.style.cssText =
    "background: #A5BFDF4D; cursor: pointer; transition: background 0.2s; display: inline-block; border-radius: 2px; line-height: normal; width: max-content; height: max-content; padding: 0 2px;";

  // Store data attributes
  span.dataset.original = originalWord;
  span.dataset.translation = translatedWord;

  // Add hover listeners
  span.addEventListener("mouseenter", () => {
    span.style.background = "#A5BFDF80";

    if (tooltipHandler) {
      const rect = span.getBoundingClientRect();
      tooltipHandler.show(
        {
          english: originalWord,
          french: translatedWord,
        },
        rect.left,
        rect.bottom + window.scrollY
      );
    }
  });

  span.addEventListener("mouseleave", () => {
    span.style.background = "#A5BFDF4D";
    tooltipHandler?.hide();
  });

  return span;
}
