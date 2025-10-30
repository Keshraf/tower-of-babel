import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { TooltipProvider, useTooltip } from "./contexts/TooltipContext";
import TooltipPortal from "./components/TooltipPortal";
import { translationService } from "./services/TranslationService";
import { translatePage } from "./translation/pageTranslator";
import { setTooltipHandler } from "./translation/nodeTranslator";

/**
 * Helper component to export tooltip context to non-React code
 * This bridges the gap between React state and vanilla DOM manipulation
 */
function TooltipContextExporter() {
  const tooltip = useTooltip();

  useEffect(() => {
    setTooltipHandler(tooltip);
  }, [tooltip]);

  return null;
}

/**
 * Main initialization function
 */
async function initializeExtension(): Promise<void> {
  console.log("Initializing translation extension...");

  try {
    // Initialize translation service
    await translationService.initialize((progress) => {
      console.log(`Model download: ${progress.toFixed(1)}%`);
    });

    // Translate the page
    await translatePage();

    console.log("Extension initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize extension:", error);

    // Show user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes("Rewriter API not available")) {
        console.error(
          "Please enable Chrome Built-in AI at chrome://flags/#optimization-guide-on-device-model"
        );
      }
    }
  }
}

/**
 * Mount React app
 */
function mountReactApp(): void {
  const tooltipContainer = document.createElement("div");
  tooltipContainer.id = "language-tooltip-root";
  document.body.appendChild(tooltipContainer);

  createRoot(tooltipContainer).render(
    <TooltipProvider>
      <TooltipContextExporter />
      <TooltipPortal />
    </TooltipProvider>
  );
}

/**
 * Start the extension
 */
function startExtension(): void {
  // Mount React first (so tooltip handler is available)
  mountReactApp();

  // Then initialize translation
  initializeExtension();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startExtension);
} else {
  startExtension();
}
