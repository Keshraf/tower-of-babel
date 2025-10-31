import { imageDescriptionService } from "../services/ImageDescriptionService";
import { translationService } from "../services/TranslationService";
import { storageService } from "../services/StorageService";
import type { SupportedLanguage } from "../utils/translationConfig";

interface WordData {
  english: string;
  translated: string;
}

interface WordHoverHandler {
  show: (data: WordData, element: HTMLElement, language: any) => void;
  hide: () => void;
}

// Store hover handler reference
let imageHoverHandler: WordHoverHandler | null = null;

/**
 * Set the hover handler (should be called from nodeTranslator)
 */
export function setImageHoverHandler(handler: WordHoverHandler): void {
  imageHoverHandler = handler;
}

/**
 * Store processed images to avoid re-processing
 */
const processedImages = new WeakSet<HTMLImageElement>();

/**
 * Check if an image is valid for translation
 */
function isValidImage(img: HTMLImageElement): boolean {
  // Skip if already processed
  if (processedImages.has(img)) {
    return false;
  }

  // Skip if too small (likely icon or decorative)
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (width < 100 || height < 100) {
    return false;
  }

  // Skip if hidden
  const computedStyle = window.getComputedStyle(img);
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    computedStyle.opacity === "0"
  ) {
    return false;
  }

  // Skip if no valid src
  if (!img.src || img.src.startsWith("data:image/svg")) {
    return false;
  }

  return true;
}

/**
 * Get image source (handles different scenarios)
 */
function getImageSource(img: HTMLImageElement): string | null {
  // Try currentSrc first (respects srcset)
  if (img.currentSrc) {
    return img.currentSrc;
  }

  // Fall back to src
  if (img.src) {
    return img.src;
  }

  return null;
}

/**
 * Create overlay element for image translation
 */
function createImageOverlay(
  img: HTMLImageElement,
  englishWord: string,
  translatedWord: string,
  language: SupportedLanguage
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "tob-image-overlay";
  overlay.setAttribute("data-tob-overlay", "true");
  overlay.setAttribute("data-english", englishWord);
  overlay.setAttribute("data-translated", translatedWord);
  overlay.setAttribute("data-language", language);

  // Create content
  overlay.innerHTML = `
    <div class="tob-image-overlay-content">
      <div class="tob-image-overlay-badge">
        <span class="tob-image-overlay-translated">${translatedWord}</span>
        <span class="tob-image-overlay-divider">•</span>
        <span class="tob-image-overlay-english">${englishWord}</span>
      </div>
    </div>
  `;

  return overlay;
}

/**
 * Add overlay to image
 */
function addOverlayToImage(img: HTMLImageElement, overlay: HTMLElement): void {
  // Wrap image in a container if not already wrapped
  let container = img.parentElement;

  if (!container?.classList.contains("tob-image-container")) {
    container = document.createElement("div");
    container.className = "tob-image-container";
    container.setAttribute("data-tob-container", "true");

    // Insert container before image
    img.parentNode?.insertBefore(container, img);

    // Move image into container
    container.appendChild(img);
  }

  // Add overlay to container
  container.appendChild(overlay);
}

/**
 * Translate a single image
 */
export async function translateImage(
  img: HTMLImageElement,
  language: SupportedLanguage
): Promise<void> {
  if (!isValidImage(img)) {
    return;
  }

  try {
    // Mark as processed
    processedImages.add(img);

    // Get image source
    const imageSource = getImageSource(img);
    if (!imageSource) {
      console.warn("[ImageTranslator] No valid image source found");
      return;
    }

    console.log(
      `[ImageTranslator] Processing image: ${imageSource.substring(0, 50)}...`
    );

    // Step 1: Describe image in English using Prompt API
    const englishWord = await imageDescriptionService.describeImage(
      imageSource
    );

    // Step 2: Translate the word using Translator API
    const translatorService = translationService.getTranslatorService();
    const translatedWord = await translatorService.translateText(englishWord);

    console.log(`[ImageTranslator] ${englishWord} → ${translatedWord}`);

    // Step 3: Record word encounter
    await storageService.recordWordEncounter(
      language,
      englishWord.toLowerCase(),
      translatedWord.toLowerCase()
    );

    // Step 4: Create and add overlay
    const overlay = createImageOverlay(
      img,
      englishWord,
      translatedWord,
      language
    );
    addOverlayToImage(img, overlay);
  } catch (error) {
    console.error("[ImageTranslator] Failed to translate image:", error);
  }
}

/**
 * Find and translate all images on the page
 */
export async function translateImages(
  language: SupportedLanguage
): Promise<void> {
  console.log("[ImageTranslator] Starting image translation...");

  // Initialize image description service
  await imageDescriptionService.initialize();

  // Find all images
  const images = document.querySelectorAll("img");
  console.log(`[ImageTranslator] Found ${images.length} images on page`);

  // Filter valid images
  const validImages = Array.from(images).filter(isValidImage);
  console.log(
    `[ImageTranslator] ${validImages.length} valid images to process`
  );

  // Translate images (limit to first 10 to avoid overwhelming the API)
  const imagesToProcess = validImages.slice(0, 10);

  for (const img of imagesToProcess) {
    await translateImage(img as HTMLImageElement, language);
  }

  console.log("[ImageTranslator] Image translation complete!");
}

/**
 * Clear all image translations from the page
 */
export function clearImageTranslations(): void {
  console.log("[ImageTranslator] Clearing image translations...");

  // Remove all overlays
  const overlays = document.querySelectorAll("[data-tob-overlay]");
  overlays.forEach((overlay) => overlay.remove());

  // Unwrap images from containers
  const containers = document.querySelectorAll(".tob-image-container");
  containers.forEach((container) => {
    const img = container.querySelector("img");
    if (img && container.parentNode) {
      container.parentNode.insertBefore(img, container);
      container.remove();
    }
  });

  // Clear processed images set
  // Note: WeakSet doesn't have a clear method, so we rely on garbage collection

  console.log("[ImageTranslator] Image translations cleared");
}
