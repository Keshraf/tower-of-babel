import { translationService } from "../services/TranslationService";
import { extractSentences, type SentenceInfo } from "../utils/textExtraction";
import { translateSentence } from "../utils/rewriterAPI";

interface WordData {
  english: string;
  french: string;
  pronunciation?: string;
}

interface TooltipHandler {
  show: (data: WordData, x: number, y: number) => void;
  hide: () => void;
}

// Store tooltip handler so DOM event handlers can access it
let tooltipHandler: TooltipHandler | null = null;

/**
 * Set the tooltip handler from React context
 * This bridges the gap between React and vanilla DOM manipulation
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

  const config = translationService.getConfig();
  const rewriter = translationService.getRewriter();

  // Extract sentences from text nodes
  const sentences = extractSentences(textNodes);
  console.log(`Extracted ${sentences.length} sentences`);

  // Process each sentence
  for (const sentenceInfo of sentences) {
    try {
      await processSentence(sentenceInfo, config, rewriter);
    } catch (error) {
      console.error("Error processing sentence:", error);
    }
  }
}

/**
 * Process a single sentence and replace words in the DOM
 */
async function processSentence(
  sentenceInfo: SentenceInfo,
  config: any,
  rewriter: any
): Promise<void> {
  const { text, node } = sentenceInfo;

  // Get translations for this sentence
  const translations = await translateSentence(text, config, rewriter);

  if (translations.size === 0) {
    return; // No words to translate in this sentence
  }

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
      const span = createTranslatedWordSpan(
        word,
        translation.translatedWord,
        translation.pronunciation || ""
      );

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
  translatedWord: string,
  pronunciation: string
): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = translatedWord;
  span.className = "translated-word";
  span.style.cssText =
    "background: #A5BFDF4D; cursor: pointer; transition: background 0.2s; display: inline-block; border-radius: 2px; line-height: normal; width: max-content; height: max-content; padding: 0 2px;";

  // Store data attributes
  span.dataset.original = originalWord;
  span.dataset.translation = translatedWord;
  span.dataset.pronunciation = pronunciation;

  // Add hover listeners
  span.addEventListener("mouseenter", () => {
    span.style.background = "#A5BFDF80";

    if (tooltipHandler) {
      const rect = span.getBoundingClientRect();
      tooltipHandler.show(
        {
          english: originalWord,
          french: translatedWord,
          pronunciation: pronunciation,
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
