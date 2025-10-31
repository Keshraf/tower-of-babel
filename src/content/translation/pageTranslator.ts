import { translationService } from "../services/TranslationService";
import {
  getContentElements,
  getTextNodes,
  extractSentences,
  batchSentences,
  ProgressiveTextLoader,
} from "../utils/textExtraction";
import { translateAndReplaceBatches } from "./nodeTranslator";
import { translationState } from "./translationState";
import { translateImages } from "./imageTranslator";

/**
 * Separate elements into visible and hidden based on viewport
 */
function separateByVisibility(elements: Element[]): {
  visible: Element[];
  hidden: Element[];
} {
  const visible: Element[] = [];
  const hidden: Element[] = [];

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
      visible.push(el);
    } else {
      hidden.push(el);
    }
  });

  return { visible, hidden };
}

/**
 * Main function to translate all content on the page
 */
export async function translatePage(): Promise<void> {
  console.log("Starting page translation...");

  if (!translationService.isInitialized()) {
    throw new Error("Translation service not initialized");
  }

  // Start a new translation session
  const abortController = translationState.start();

  try {
    const contentElements = getContentElements();
    console.log(`Found ${contentElements.length} content elements to process`);

    if (contentElements.length === 0) {
      console.warn("No content elements found to translate");
      return;
    }

    // Separate visible and hidden elements
    const { visible, hidden } = separateByVisibility(contentElements);
    console.log(`Visible: ${visible.length}, Hidden: ${hidden.length}`);

    // Process visible content immediately
    if (visible.length > 0) {
      // Extract text nodes from visible elements
      const visibleTextNodes = getTextNodes(visible);
      console.log(`Found ${visibleTextNodes.length} visible text nodes`);

      // Extract sentences from text nodes
      const visibleSentences = extractSentences(visibleTextNodes);
      console.log(`Extracted ${visibleSentences.length} visible sentences`);

      // Batch sentences into groups of 5
      const visibleBatches = batchSentences(visibleSentences, 5);
      console.log(
        `Created ${visibleBatches.length} batches for visible content`
      );

      // Check if still active before processing
      if (!translationState.shouldContinue()) {
        console.log("Translation cancelled before processing visible batches");
        return;
      }

      // Process batches with streaming progress updates
      await translateAndReplaceBatches(
        visibleBatches,
        3, // Process 3 batches concurrently
        (completed, total) => {
          console.log(`Progress: ${completed}/${total} batches translated`);
        }
      );
    }

    // Check again before setting up progressive loading
    if (!translationState.shouldContinue()) {
      console.log("Translation cancelled before progressive loading");
      return;
    }

    // Set up progressive loading for hidden content
    if (hidden.length > 0) {
      const loader = new ProgressiveTextLoader(async (element) => {
        // Check if translation is still active
        if (!translationState.shouldContinue()) {
          console.log("Translation cancelled, skipping lazy loading");
          return;
        }

        const textNodes = getTextNodes([element]);
        const sentences = extractSentences(textNodes);
        const batches = batchSentences(sentences, 5);

        console.log(`Lazily processing ${batches.length} batches`);
        await translateAndReplaceBatches(
          batches,
          3, // Process 3 batches concurrently
          (completed, total) => {
            console.log(`Lazy load progress: ${completed}/${total} batches translated`);
          }
        );
      });

      loader.observe(hidden);
    }

    // Translate images after text translation is complete
    if (translationState.shouldContinue()) {
      console.log("Starting image translation...");
      const currentLanguage = translationService.getCurrentLanguage();
      await translateImages(currentLanguage);
    }

    console.log("Page translation complete");
  } catch (error) {
    // Check if it was aborted
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Translation was cancelled");
    } else {
      console.error("Error during translation:", error);
    }
  }
}

/**
 * Stop any ongoing translation
 */
export function stopTranslation(): void {
  translationState.stop();
}
