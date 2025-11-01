import { selectionTranslationService } from "./services/SelectionTranslationService";
import type { SupportedLanguage } from "./utils/translationConfig";

/**
 * Selection Handler - Handles text selection translation via context menu
 */

// Store the last selection range to restore after translation
let lastSelectionRange: Range | null = null;

/**
 * Initialize selection handler
 */
export function initializeSelectionHandler(): void {
  console.log("[SelectionHandler] Initializing");

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TRANSLATE_SELECTION") {
      handleTranslateSelection(
        message.text,
        message.language,
        message.simplify || false
      );
      sendResponse({ success: true });
    }
    return true;
  });

  // Store selection range when user makes a selection
  // This helps us restore it after right-click menu interaction
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      lastSelectionRange = selection.getRangeAt(0).cloneRange();
    }
  });

  console.log("[SelectionHandler] Initialized");
}

/**
 * Handle translation request for selected text
 */
async function handleTranslateSelection(
  text: string,
  language: SupportedLanguage,
  simplify: boolean = false
): Promise<void> {
  console.log(
    `[SelectionHandler] ${simplify ? "Simplifying & Translating" : "Translating"} "${text.substring(0, 30)}..." to ${language}`
  );

  if (!text || text.trim().length === 0) {
    console.warn("[SelectionHandler] No text to translate");
    showNotification("No text selected", "error");
    return;
  }

  try {
    // Show loading indicator
    const loadingMessage = simplify
      ? "Simplifying & Translating..."
      : "Translating...";
    showNotification(loadingMessage, "loading");

    // Translate the text (with optional simplification)
    const translation = await selectionTranslationService.translateSelectedText(
      text,
      language,
      simplify
    );

    // Replace the selected text with translation
    replaceSelectedText(translation);

    // Show success notification
    showNotification("Translated!", "success");

    console.log("[SelectionHandler] Translation complete");
  } catch (error) {
    console.error("[SelectionHandler] Translation failed:", error);
    showNotification("Translation failed. Please try again.", "error");
  }
}

/**
 * Replace selected text with translation
 */
function replaceSelectedText(translation: string): void {
  // Try to use the stored selection range first
  let range = lastSelectionRange;

  // If no stored range, try to get current selection
  if (!range) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }
  }

  if (!range) {
    console.error("[SelectionHandler] No selection range available");
    showNotification("Could not find selected text", "error");
    return;
  }

  try {
    // Delete the selected content
    range.deleteContents();

    // Create a text node with the translation
    const textNode = document.createTextNode(translation);

    // Insert the translation at the selection point
    range.insertNode(textNode);

    // Highlight the translated text briefly
    highlightTranslatedText(range, textNode);

    // Clear the stored range
    lastSelectionRange = null;

    console.log("[SelectionHandler] Text replaced successfully");
  } catch (error) {
    console.error("[SelectionHandler] Error replacing text:", error);
    showNotification("Could not replace text", "error");
  }
}

/**
 * Highlight translated text briefly for visual feedback
 */
function highlightTranslatedText(range: Range, textNode: Text): void {
  try {
    // Wrap the text node in a span for highlighting
    const span = document.createElement("span");
    span.style.cssText =
      "background-color: #FEF08A; transition: background-color 2s ease;";

    // Replace text node with span
    if (textNode.parentNode) {
      textNode.parentNode.insertBefore(span, textNode);
      span.appendChild(textNode);

      // Remove highlight after 2 seconds
      setTimeout(() => {
        span.style.backgroundColor = "transparent";
        // Remove span after transition
        setTimeout(() => {
          if (span.parentNode) {
            span.parentNode.insertBefore(textNode, span);
            span.remove();
          }
        }, 2000);
      }, 500);
    }
  } catch (error) {
    console.error("[SelectionHandler] Error highlighting text:", error);
    // Non-critical, don't show error to user
  }
}

/**
 * Show notification to user
 */
function showNotification(message: string, type: "loading" | "success" | "error"): void {
  // Remove existing notification
  const existing = document.getElementById("tob-translation-notification");
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.id = "tob-translation-notification";

  // Style based on type
  const colors = {
    loading: { bg: "#3B82F6", text: "#FFFFFF" },
    success: { bg: "#10B981", text: "#FFFFFF" },
    error: { bg: "#EF4444", text: "#FFFFFF" },
  };

  const color = colors[type];

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${color.bg};
    color: ${color.text};
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    animation: tob-slide-in 0.3s ease-out;
  `;

  notification.textContent = message;

  // Add animation styles
  if (!document.getElementById("tob-notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "tob-notification-styles";
    styles.textContent = `
      @keyframes tob-slide-in {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes tob-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove after delay (except for loading state)
  if (type !== "loading") {
    setTimeout(() => {
      notification.style.animation = "tob-slide-out 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}
