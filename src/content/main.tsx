import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { WordHoverProvider, useWordHover } from "./contexts/TooltipContext";
import TooltipPortal from "./components/TooltipPortal";
import { translationService } from "./services/TranslationService";
import { storageService } from "./services/StorageService";
import { translatePage, stopTranslation } from "./translation/pageTranslator";
import { clearTranslations } from "./translation/translationCleaner";
import { setTooltipHandler } from "./translation/nodeTranslator";
import type { SupportedLanguage } from "./utils/translationConfig";
import "./content.css";

function WordHoverContextExporter() {
  const wordHover = useWordHover();

  useEffect(() => {
    setTooltipHandler(wordHover);
  }, [wordHover]);

  return null;
}

/**
 * Check if onboarding is complete and translation is enabled
 */
async function shouldInitialize(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(["config", "system"]);
    const config = result.config || {};
    const system = result.system || {};

    const onboardingComplete = system.onboardingComplete || false;
    const translationEnabled = config.translationEnabled !== false;

    console.log("Initialization check:", {
      onboardingComplete,
      translationEnabled,
    });

    return onboardingComplete && translationEnabled;
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
    // Initialize services
    await translationService.initialize((progress, stage) => {
      console.log(`[${progress.toFixed(0)}%] ${stage}`);
    });

    console.log("Translation services ready, starting page translation...");

    // Translate the page
    await translatePage();

    // Increment page count
    const language = translationService.getCurrentLanguage();
    await storageService.incrementStat(language, "totalPagesTranslated");

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

  if (message.type === "LANGUAGE_CHANGED") {
    handleLanguageChange(message.language);
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
 * Handle language change from popup
 */
async function handleLanguageChange(
  newLanguage: SupportedLanguage
): Promise<void> {
  console.log(`Language changed to ${newLanguage}`);

  try {
    // Step 1: Stop any ongoing translation
    stopTranslation();

    // Step 2: Clear existing translations from the page
    clearTranslations();

    // Step 3: Reset and switch language
    translationService.reset();
    await translationService.switchLanguage(newLanguage);

    // Step 4: Re-translate page with new language if enabled
    const result = await chrome.storage.local.get("config");
    const config = result.config || {};
    const isEnabled = config.translationEnabled !== false;

    if (isEnabled) {
      console.log("Re-translating page with new language...");
      await translatePage();

      // Increment page count for new language
      await storageService.incrementStat(newLanguage, "totalPagesTranslated");
    }

    console.log("Language change complete!");
  } catch (error) {
    console.error("Error handling language change:", error);
  }
}

/**
 * Inject microphone permission iframe
 */
function injectMicrophonePermissionIframe(): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("hidden", "hidden");
  iframe.setAttribute("id", "permissionsIFrame");
  iframe.setAttribute("allow", "microphone");
  iframe.src = chrome.runtime.getURL("src/permission/index.html");
  document.body.appendChild(iframe);
}

/**
 * Mount React app
 */
function mountReactApp(): void {
  const hoverContainer = document.createElement("div");
  hoverContainer.id = "language-hover-root";
  document.body.appendChild(hoverContainer);

  createRoot(hoverContainer).render(
    <WordHoverProvider>
      <WordHoverContextExporter />
      <TooltipPortal />
    </WordHoverProvider>
  );
}

/**
 * Start the extension
 */
async function startExtension(): Promise<void> {
  // Inject microphone permission iframe first
  injectMicrophonePermissionIframe();

  // Always mount React (for hover card)
  mountReactApp();

  // Check if we should initialize
  const shouldStart = await shouldInitialize();

  if (shouldStart) {
    console.log(
      "Onboarding complete and translation enabled - starting automatically"
    );
    await initializeAndTranslate();
  } else {
    console.log(
      "Translation disabled or onboarding not complete - waiting for user action"
    );
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startExtension);
} else {
  startExtension();
}
