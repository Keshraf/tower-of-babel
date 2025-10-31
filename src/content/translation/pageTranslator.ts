import { translationService } from "../services/TranslationService";
import {
  getContentElements,
  getTextNodes,
  ProgressiveTextLoader,
} from "../utils/textExtraction";
import { translateAndReplaceNodes } from "./nodeTranslator";
import { translationState } from "./translationState";

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
      const visibleTextNodes = getTextNodes(visible);
      console.log(`Processing ${visibleTextNodes.length} visible text nodes`);

      // Check if still active before processing
      if (!translationState.shouldContinue()) {
        console.log("Translation cancelled before processing visible nodes");
        return;
      }

      await translateAndReplaceNodes(visibleTextNodes);
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
        console.log(`Lazily processing ${textNodes.length} text nodes`);
        await translateAndReplaceNodes(textNodes);
      });

      loader.observe(hidden);
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
