import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { TooltipProvider, useTooltip } from "./contexts/TooltipContext";
import TooltipPortal from "./components/TooltipPortal";
import { translationService } from "./services/TranslationService";
import { translatePage, stopTranslation } from "./translation/pageTranslator";
import { clearTranslations } from "./translation/translationCleaner";
import { setTooltipHandler } from "./translation/nodeTranslator";

function TooltipContextExporter() {
  const tooltip = useTooltip();

  useEffect(() => {
    setTooltipHandler(tooltip);
  }, [tooltip]);

  return null;
}

/**
 * Check if models are downloaded and translation is enabled
 */
async function shouldInitialize(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get([
      "modelsDownloaded",
      "translationEnabled",
    ]);

    const modelsDownloaded = result.modelsDownloaded || false;
    const translationEnabled = result.translationEnabled !== false;

    console.log("Initialization check:", {
      modelsDownloaded,
      translationEnabled,
    });

    return modelsDownloaded && translationEnabled;
  } catch (error) {
    console.error("Error checking initialization status:", error);
    return false;
  }
}

/**
 * Initialize and translate page
 */
async function initializeAndTranslate(): Promise<void> {
  console.log("Initializing translation extension...");

  try {
    // Initialize services (no download needed - already done in onboarding!)
    await translationService.initialize((progress, stage) => {
      console.log(`[${progress.toFixed(0)}%] ${stage}`);
    });

    console.log("Translation services ready, starting page translation...");

    // Translate the page
    await translatePage();

    console.log("Page translation complete!");
  } catch (error) {
    console.error("Failed to initialize extension:", error);
  }
}

/**
 * Handle toggle state changes from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_TRANSLATION_STATE") {
    handleToggleChange(message.enabled);
  }
  sendResponse({ success: true });
  return true;
});

/**
 * Handle toggle on/off
 */
async function handleToggleChange(enabled: boolean): Promise<void> {
  if (enabled) {
    // User turned translation ON
    console.log("Translation enabled - starting translation");
    await initializeAndTranslate();
  } else {
    // User turned translation OFF
    console.log("Translation disabled - stopping and clearing translations");

    // First, stop any ongoing translation
    stopTranslation();

    // Then clear existing translations from the page
    clearTranslations();
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
async function startExtension(): Promise<void> {
  // Always mount React (for tooltip)
  mountReactApp();

  // Check if we should initialize
  const shouldStart = await shouldInitialize();

  if (shouldStart) {
    console.log(
      "Models downloaded and translation enabled - starting automatically"
    );
    await initializeAndTranslate();
  } else {
    console.log(
      "Translation disabled or models not downloaded - waiting for user action"
    );
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startExtension);
} else {
  startExtension();
}
