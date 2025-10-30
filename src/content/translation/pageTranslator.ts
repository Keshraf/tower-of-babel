import { translationService } from "../services/TranslationService";
import {
  getContentElements,
  getTextNodes,
  ProgressiveTextLoader,
} from "../utils/textExtraction";
import { translateAndReplaceNodes } from "./nodeTranslator";

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
    await translateAndReplaceNodes(visibleTextNodes);
  }

  // Set up progressive loading for hidden content
  if (hidden.length > 0) {
    const loader = new ProgressiveTextLoader(async (element) => {
      const textNodes = getTextNodes([element]);
      console.log(`Lazily processing ${textNodes.length} text nodes`);
      await translateAndReplaceNodes(textNodes);
    });

    loader.observe(hidden);
  }

  console.log("Page translation complete");
}
