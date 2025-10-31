/**
 * Selectors for content we WANT to translate
 */
const INCLUDE_SELECTORS = [
  "article p",
  "article h1",
  "article h2",
  "article h3",
  "main p",
  "main h1",
  "main h2",
  "main h3",
  '[role="main"] p',
  ".content p",
  ".post p",
  ".article p",
  "p",
  "h1",
  "h2",
  "h3",
];

/**
 * Selectors for elements we DON'T want to translate
 */
const EXCLUDE_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "code",
  "pre",
  "script",
  "style",
  ".ad",
  ".advertisement",
  ".menu",
  ".sidebar",
  ".comments",
];

/**
 * Check if an element should be excluded
 */
function shouldExclude(element: Element): boolean {
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
      if (!node.textContent?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

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

  const mainSelectors = ["main", "article", '[role="main"]'];
  let mainContent: Element | null = null;

  for (const selector of mainSelectors) {
    mainContent = document.querySelector(selector);
    if (mainContent) break;
  }

  if (mainContent) {
    INCLUDE_SELECTORS.forEach((selector) => {
      mainContent!.querySelectorAll(selector).forEach((el) => {
        if (!shouldExclude(el) && el.textContent?.trim()) {
          elements.add(el);
        }
      });
    });
  } else {
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
 * Sentence information with text node reference
 */
export interface SentenceInfo {
  text: string;
  node: Text;
  startOffset: number;
  endOffset: number;
}

/**
 * Extract sentences from text nodes
 */
export function extractSentences(textNodes: Text[]): SentenceInfo[] {
  const sentences: SentenceInfo[] = [];

  textNodes.forEach((node) => {
    if (!node.textContent) return;

    const text = node.textContent;
    // Match sentences ending with . ! ? or just text without punctuation
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
 * NEW: Batch of sentences for processing together
 */
export interface SentenceBatch {
  sentences: SentenceInfo[];
  combinedText: string;
}

/**
 * NEW: Group sentences into batches of specified size
 */
export function batchSentences(
  sentences: SentenceInfo[],
  batchSize: number = 5
): SentenceBatch[] {
  const batches: SentenceBatch[] = [];

  for (let i = 0; i < sentences.length; i += batchSize) {
    const batchSentences = sentences.slice(i, i + batchSize);
    const combinedText = batchSentences.map((s) => s.text).join(" ");

    batches.push({
      sentences: batchSentences,
      combinedText: combinedText,
    });
  }

  console.log(
    `Created ${batches.length} batches from ${sentences.length} sentences`
  );
  return batches;
}

/**
 * Progressive loader using Intersection Observer
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
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.1,
      }
    );
  }

  observe(elements: Element[]) {
    elements.forEach((el) => this.observer.observe(el));
  }

  disconnect() {
    this.observer.disconnect();
  }
}
