/**
 * Manages the active state of translation to allow cancellation
 */
class TranslationState {
  private isActive: boolean = false;
  private abortController: AbortController | null = null;

  /**
   * Start a new translation session
   */
  start(): AbortController {
    this.isActive = true;
    this.abortController = new AbortController();
    console.log("Translation session started");
    return this.abortController;
  }

  /**
   * Stop the current translation session
   */
  stop(): void {
    this.isActive = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log("Translation session stopped");
    }
  }

  /**
   * Check if translation should continue
   */
  shouldContinue(): boolean {
    return this.isActive && !this.abortController?.signal.aborted;
  }

  /**
   * Get the current abort signal
   */
  getSignal(): AbortSignal | null {
    return this.abortController?.signal || null;
  }

  /**
   * Check if currently active
   */
  isTranslating(): boolean {
    return this.isActive;
  }
}

export const translationState = new TranslationState();
