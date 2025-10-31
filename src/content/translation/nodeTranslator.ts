import { translationService } from "../services/TranslationService";
import { extractSentences, type SentenceInfo } from "../utils/textExtraction";
import { translationState } from "./translationState";

interface WordData {
  english: string;
  french: string;
}

interface TooltipHandler {
  show: (data: WordData, x: number, y: number) => void;
  hide: () => void;
}

interface TranslationResult {
  originalWord: string;
  translatedWord: string;
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
 * Translate and replace text nodes in the DOM
 */
export async function translateAndReplaceNodes(
  textNodes: Text[]
): Promise<void> {
  console.log(`Translating and replacing ${textNodes.length} text nodes`);

  if (!translationService.isInitialized()) {
    console.warn("Translation service not initialized, skipping translation");
    return;
  }

  // Check if translation is still active
  if (!translationState.shouldContinue()) {
    console.log("Translation cancelled, skipping node processing");
    return;
  }

  const promptService = translationService.getPromptService();
  const translatorService = translationService.getTranslatorService();
  const config = translationService.getConfig();

  // Extract sentences from text nodes
  const sentences = extractSentences(textNodes);
  console.log(`Extracted ${sentences.length} sentences`);

  // Process each sentence
  for (const sentenceInfo of sentences) {
    // Check if we should continue before each sentence
    if (!translationState.shouldContinue()) {
      console.log("Translation cancelled mid-processing");
      return;
    }

    try {
      await processSentence(
        sentenceInfo,
        promptService,
        translatorService,
        config
      );
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Sentence processing aborted");
        return;
      }
      console.error("Error processing sentence:", error);
    }
  }
}

/**
 * Process a single sentence: select words and translate them
 */
async function processSentence(
  sentenceInfo: SentenceInfo,
  promptService: any,
  translatorService: any,
  config: any
): Promise<void> {
  const { text, node } = sentenceInfo;

  console.log(`Processing sentence: "${text.substring(0, 100)}..."`);

  // Check if still active
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 1: Use Prompt API to select words to translate
  const wordsToTranslate = await promptService.selectWordsToTranslate(
    text,
    config
  );

  if (wordsToTranslate.length === 0) {
    console.log("No words selected for translation in this sentence");
    return;
  }

  console.log(`Selected ${wordsToTranslate.length} words:`, wordsToTranslate);

  // Check again before translation
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 2: Use Translator API to translate selected words
  const translations = await translatorService.translateWords(
    wordsToTranslate,
    text
  );

  if (translations.size === 0) {
    console.log("No translations returned");
    return;
  }

  // Check one more time before DOM manipulation
  if (!translationState.shouldContinue()) {
    throw new DOMException("Translation aborted", "AbortError");
  }

  // Step 3: Replace words in the DOM
  replaceWordsInNode(node, translations);
}

/**
 * Replace translated words in the DOM node
 */
function replaceWordsInNode(
  node: Text,
  translations: Map<string, TranslationResult>
): void {
  // Split the node's text into words, preserving whitespace
  const words = node.textContent?.split(/(\s+)/) || [];
  const fragment = document.createDocumentFragment();

  words.forEach((segment) => {
    // Skip empty segments
    if (!segment) return;

    // If it's whitespace, keep it as-is
    if (/^\s+$/.test(segment)) {
      fragment.appendChild(document.createTextNode(segment));
      return;
    }

    // Extract the actual word (remove punctuation for lookup)
    const wordMatch = segment.match(/\b[\w']+\b/);
    if (!wordMatch) {
      fragment.appendChild(document.createTextNode(segment));
      return;
    }

    const word = wordMatch[0];
    const wordLower = word.toLowerCase();

    // Check if this word should be translated
    const translation = translations.get(wordLower);

    if (translation) {
      // Split the segment into before, word, and after (to preserve punctuation)
      const beforeWord = segment.substring(0, wordMatch.index);
      const afterWord = segment.substring((wordMatch.index || 0) + word.length);

      // Add text before the word (if any)
      if (beforeWord) {
        fragment.appendChild(document.createTextNode(beforeWord));
      }

      // Create span for translated word
      const span = createTranslatedWordSpan(word, translation.translatedWord);

      fragment.appendChild(span);

      // Add text after the word (punctuation, etc.)
      if (afterWord) {
        fragment.appendChild(document.createTextNode(afterWord));
      }
    } else {
      // Keep original segment if not translating
      fragment.appendChild(document.createTextNode(segment));
    }
  });

  // Replace the text node with our fragment
  node.parentNode?.replaceChild(fragment, node);
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
