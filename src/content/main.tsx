// content/index.tsx
import { createRoot } from "react-dom/client";
import TooltipPortal from "../components/TooltipPortal";
import {
  getContentElements,
  getTextNodes,
  ProgressiveTextLoader,
  extractSentences,
  type SentenceInfo,
} from "./utils/textExtraction";
import {
  isRewriterAvailable,
  createRewriter,
  translateSentence,
} from "./utils/rewriterAPI";
import {
  getTranslationConfig,
  type TranslationConfig,
} from "./utils/translationConfig";

// Shared state
export const tooltipState = {
  currentWord: null,
  position: { x: 0, y: 0 },
  listeners: new Set<() => void>(),

  show(wordData: any, x: number, y: number) {
    this.currentWord = wordData;
    this.position = { x, y };
    this.notify();
  },

  hide() {
    this.currentWord = null;
    this.notify();
  },

  notify() {
    this.listeners.forEach((fn) => fn());
  },
};

// Global rewriter instance
let globalRewriter: any = null;
let translationConfig: TranslationConfig | null = null;

// Translate and replace text nodes using sentence-based approach
async function translateAndReplaceNodes(textNodes: Text[]) {
  console.log(`Translating and replacing ${textNodes.length} text nodes`);

  // Ensure we have a rewriter instance
  if (!globalRewriter) {
    console.warn("Rewriter not initialized, skipping translation");
    return;
  }

  if (!translationConfig) {
    console.warn("Translation config not loaded, skipping translation");
    return;
  }

  // Extract sentences from text nodes
  const sentences = extractSentences(textNodes);
  console.log(`Extracted ${sentences.length} sentences`);

  // Process each sentence
  for (const sentenceInfo of sentences) {
    try {
      await processSentence(sentenceInfo, translationConfig, globalRewriter);
    } catch (error) {
      console.error("Error processing sentence:", error);
    }
  }
}

// Process a single sentence and replace words in the DOM
async function processSentence(
  sentenceInfo: SentenceInfo,
  config: TranslationConfig,
  rewriter: any
) {
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
      const span = document.createElement("span");
      span.textContent = translation.translatedWord;
      span.className = "translated-word";
      span.style.cssText =
        "background: #A5BFDF4D; cursor: pointer; transition: background 0.2s; display: inline-block; border-radius: 2px; line-height: normal; width: max-content; height: max-content; padding: 0 2px;";
      span.dataset.original = word;
      span.dataset.translation = translation.translatedWord;
      span.dataset.pronunciation = translation.pronunciation || "";

      // Hover listeners
      span.addEventListener("mouseenter", () => {
        span.style.background = "#A5BFDF80";
        const rect = span.getBoundingClientRect();
        tooltipState.show(
          {
            english: word,
            french: translation.translatedWord,
            pronunciation: translation.pronunciation || "",
          },
          rect.left,
          rect.bottom + window.scrollY
        );
      });

      span.addEventListener("mouseleave", () => {
        span.style.background = "#A5BFDF4D";
        tooltipState.hide();
      });

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

// Initialize progressive translation
async function initializeTranslation() {
  console.log("Initializing translation system...");

  // Check if Rewriter API is available
  const availability = await isRewriterAvailable();

  if (availability === "no") {
    console.error("Rewriter API not available. Translation disabled.");
    console.error("Make sure you are using Chrome with Built-in AI enabled.");
    console.error(
      "Visit chrome://flags/#optimization-guide-on-device-model to enable it."
    );
    return;
  }

  // Load translation config
  translationConfig = await getTranslationConfig();
  console.log("Translation config loaded:", translationConfig);

  // Create rewriter instance
  try {
    if (availability === "available") {
      console.log("Rewriter is ready to use immediately!");
    } else {
      console.log(
        "Rewriter model will be downloaded. This may take a few minutes..."
      );
    }

    globalRewriter = await createRewriter(translationConfig, (progress) => {
      console.log(`Download progress: ${progress.toFixed(1)}%`);
    });

    console.log("Rewriter initialized successfully");
  } catch (error) {
    console.error("Failed to initialize rewriter:", error);
    console.error("Error details:", error);
    return;
  }

  const contentElements = getContentElements();
  console.log(`Found ${contentElements.length} content elements to process`);

  // Separate visible and hidden elements
  const visibleElements: Element[] = [];
  const hiddenElements: Element[] = [];

  contentElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
      visibleElements.push(el);
    } else {
      hiddenElements.push(el);
    }
  });

  console.log(
    `Visible: ${visibleElements.length}, Hidden: ${hiddenElements.length}`
  );

  // Process visible content immediately
  if (visibleElements.length > 0) {
    const visibleTextNodes = getTextNodes(visibleElements);
    console.log(`Processing ${visibleTextNodes.length} visible text nodes`);
    await translateAndReplaceNodes(visibleTextNodes);
  }

  // Set up progressive loading for hidden content
  if (hiddenElements.length > 0) {
    const loader = new ProgressiveTextLoader(async (element) => {
      const textNodes = getTextNodes([element]);
      console.log(`Lazily processing ${textNodes.length} text nodes`);
      await translateAndReplaceNodes(textNodes);
    });

    loader.observe(hiddenElements);
  }
}

// Mount React tooltip (runs once)
const tooltipContainer = document.createElement("div");
tooltipContainer.id = "language-tooltip-root";
document.body.appendChild(tooltipContainer);
createRoot(tooltipContainer).render(<TooltipPortal state={tooltipState} />);

// Start the translation when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTranslation);
} else {
  initializeTranslation();
}
