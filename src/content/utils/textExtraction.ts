// content/utils/textExtraction.ts

/**
 * Selectors for content we WANT to translate
 */
const INCLUDE_SELECTORS = [
  "article p", // Article paragraphs
  "article h1",
  "article h2",
  "article h3",
  "main p", // Main content paragraphs
  "main h1",
  "main h2",
  "main h3",
  '[role="main"] p', // ARIA main role
  ".content p", // Common content class
  ".post p", // Blog posts
  ".article p",
  "p", // Fallback to all paragraphs
  "h1", // Standalone headings
  "h2",
  "h3",
];

/**
 * Selectors for elements we DON'T want to translate
 */
const EXCLUDE_SELECTORS = [
  "nav", // Navigation
  "header", // Page headers
  "footer", // Page footers
  "aside", // Sidebars
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  "button", // Buttons
  "a", // Links (or we could include but style differently)
  "input",
  "textarea",
  "select",
  "code", // Code blocks
  "pre",
  "script",
  "style",
  ".ad", // Ads
  ".advertisement",
  ".menu",
  ".sidebar",
  ".comments", // Comment sections
];

/**
 * Check if an element should be excluded
 */
function shouldExclude(element: Element): boolean {
  // Check if element or any parent matches exclude selectors
  let current: Element | null = element;

  while (current) {
    for (const selector of EXCLUDE_SELECTORS) {
      if (current.matches(selector)) {
        return true;
      }
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Get text nodes from an element, excluding child elements we don't want
 */
function getTextNodesFromElement(element: Element): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Skip empty or whitespace-only nodes
      if (!node.textContent?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      // Check if parent element should be excluded
      if (node.parentElement && shouldExclude(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  return textNodes;
}

/**
 * Get all relevant content elements from the page
 */
export function getContentElements(): Element[] {
  const elements = new Set<Element>();

  // Try to find main content area first (most specific)
  const mainSelectors = ["main", "article", '[role="main"]'];
  let mainContent: Element | null = null;

  for (const selector of mainSelectors) {
    mainContent = document.querySelector(selector);
    if (mainContent) break;
  }

  if (mainContent) {
    // If we found main content, only search within it
    INCLUDE_SELECTORS.forEach((selector) => {
      mainContent!.querySelectorAll(selector).forEach((el) => {
        if (!shouldExclude(el) && el.textContent?.trim()) {
          elements.add(el);
        }
      });
    });
  } else {
    // Fallback: search entire document
    INCLUDE_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!shouldExclude(el) && el.textContent?.trim()) {
          elements.add(el);
        }
      });
    });
  }

  return Array.from(elements);
}

/**
 * Get text nodes from specific elements
 */
export function getTextNodes(elements: Element[]): Text[] {
  const allTextNodes: Text[] = [];

  elements.forEach((element) => {
    const textNodes = getTextNodesFromElement(element);
    allTextNodes.push(...textNodes);
  });

  return allTextNodes;
}

/**
 * Extract sentences from text nodes
 * Returns array of objects containing sentence text and corresponding node
 */
export interface SentenceInfo {
  text: string;
  node: Text;
  startOffset: number;
  endOffset: number;
}

export function extractSentences(textNodes: Text[]): SentenceInfo[] {
  const sentences: SentenceInfo[] = [];

  textNodes.forEach((node) => {
    if (!node.textContent) return;

    const text = node.textContent;

    // Split by sentence boundaries (., !, ?, with optional quotes/spaces)
    // This regex tries to keep sentence-ending punctuation with the sentence
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
    const matches = text.matchAll(sentenceRegex);

    let currentOffset = 0;

    for (const match of matches) {
      const sentenceText = match[0].trim();

      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          node: node,
          startOffset: match.index || currentOffset,
          endOffset: (match.index || currentOffset) + match[0].length,
        });
      }

      currentOffset = (match.index || currentOffset) + match[0].length;
    }
  });

  return sentences;
}

/**
 * Progressive loader using Intersection Observer
 * Processes elements as they become visible in viewport
 */
export class ProgressiveTextLoader {
  private observer: IntersectionObserver;
  private processedElements = new WeakSet<Element>();
  private onElementVisible: (element: Element) => void;

  constructor(onElementVisible: (element: Element) => void) {
    this.onElementVisible = onElementVisible;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !this.processedElements.has(entry.target)
          ) {
            this.processedElements.add(entry.target);
            this.onElementVisible(entry.target);
            // Stop observing once processed
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before element is visible
        threshold: 0.1,
      }
    );
  }

  /**
   * Start observing elements for translation
   */
  observe(elements: Element[]) {
    elements.forEach((el) => this.observer.observe(el));
  }

  /**
   * Clean up observer
   */
  disconnect() {
    this.observer.disconnect();
  }
}
