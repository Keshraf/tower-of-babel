import { clearImageTranslations } from "./imageTranslator";

/**
 * Remove all translated words and restore original text
 */
export function clearTranslations(): void {
  console.log("Clearing all translations...");

  // Clear text translations
  const translatedWords = document.querySelectorAll(".translated-word");

  translatedWords.forEach((span) => {
    const originalWord = span.getAttribute("data-english");
    if (originalWord) {
      // Create a text node with the original word
      const textNode = document.createTextNode(originalWord);
      // Replace the span with the text node
      span.parentNode?.replaceChild(textNode, span);
    }
  });

  console.log(`Cleared ${translatedWords.length} text translations`);

  // Clear image translations
  clearImageTranslations();
}

/**
 * Check if page has translations
 */
export function hasTranslations(): boolean {
  return document.querySelectorAll(".translated-word").length > 0;
}

/**
 * Get count of translated words on page
 */
export function getTranslationCount(): number {
  return document.querySelectorAll(".translated-word").length;
}

/**
 * Clear translations in a specific element
 */
export function clearTranslationsInElement(element: Element): void {
  const translatedWords = element.querySelectorAll(".translated-word");

  translatedWords.forEach((span) => {
    const originalWord = span.getAttribute("data-english");
    if (originalWord) {
      const textNode = document.createTextNode(originalWord);
      span.parentNode?.replaceChild(textNode, span);
    }
  });

  console.log(
    `Cleared ${translatedWords.length} translations in element:`,
    element
  );
}
