import { useState, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  getLanguageCode,
} from "../content/utils/translationConfig";
import { storageService } from "../content/services/StorageService";

type Screen = "welcome" | "download-prompt" | "download-french" | "download-spanish" | "download-rewriter" | "success";

interface DownloadProgress {
  prompt: number;
  french: number;
  spanish: number;
  rewriter: number;
}

type DownloadStep = "prompt" | "french" | "spanish" | "rewriter";

export default function Onboarding() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>("french");
  const [progress, setProgress] = useState<DownloadProgress>({
    prompt: 0,
    french: 0,
    spanish: 0,
    rewriter: 0,
  });
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Check if language is pre-selected via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const languageParam = params.get("language");
    if (
      languageParam &&
      (languageParam === "french" || languageParam === "spanish")
    ) {
      setSelectedLanguage(languageParam as SupportedLanguage);
    }
  }, []);

  const handleGetStarted = async () => {
    // Check if APIs are available
    if (!("LanguageModel" in self) || !("Translator" in self) || !("Rewriter" in self)) {
      setError(
        "AI APIs not available. Please enable Chrome Built-in AI at chrome://flags/#optimization-guide-on-device-model"
      );
      return;
    }

    // Check what's already downloaded
    const isPromptDownloaded = await storageService.isPromptModelDownloaded();
    const downloadedLanguages = await storageService.getDownloadedLanguages();

    if (isPromptDownloaded) {
      setProgress((prev) => ({ ...prev, prompt: 100 }));
    }
    if (downloadedLanguages.includes("french")) {
      setProgress((prev) => ({ ...prev, french: 100 }));
    }
    if (downloadedLanguages.includes("spanish")) {
      setProgress((prev) => ({ ...prev, spanish: 100 }));
    }

    // Start with first incomplete step
    if (!isPromptDownloaded) {
      setScreen("download-prompt");
    } else if (!downloadedLanguages.includes("french")) {
      setScreen("download-french");
    } else if (!downloadedLanguages.includes("spanish")) {
      setScreen("download-spanish");
    } else {
      setScreen("download-rewriter");
    }
  };

  const downloadPromptModel = async () => {
    try {
      console.log("[Onboarding] Starting Prompt API download...");

      // Check availability first
      const availability = await (self as any).LanguageModel.availability();
      console.log("[Onboarding] Prompt API availability:", availability);

      setStatus("Downloading word selection AI...");
      const languageModelParams = await (self as any).LanguageModel.params();

      console.log("[Onboarding] Creating LanguageModel with params:", languageModelParams);
      const languageModel = await (self as any).LanguageModel.create({
        temperature: languageModelParams.defaultTemperature,
        topK: languageModelParams.defaultTopK,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progressValue = (e.loaded / e.total) * 100;
            console.log(`[Onboarding] Prompt API download progress: ${progressValue.toFixed(1)}%`);
            setProgress((prev) => ({ ...prev, prompt: progressValue }));
          });
        },
      });

      console.log("[Onboarding] LanguageModel created successfully:", languageModel);
      setProgress((prev) => ({ ...prev, prompt: 100 }));

      // Don't destroy - this would remove the downloaded model from cache
      // Just let it be garbage collected naturally
      // languageModel.destroy();

      // Mark Prompt API as downloaded
      await storageService.setPromptModelDownloaded();
      console.log("[Onboarding] ✅ Prompt API downloaded and marked as complete");

      setStatus("Word selection AI downloaded! Click Next to continue.");
      // Don't auto-advance - let user click Next
    } catch (err) {
      console.error("Error downloading Prompt API:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Download failed");
    }
  };

  const downloadFrenchModel = async () => {
    try {
      console.log("[Onboarding] Starting French translator download...");

      // Check availability first
      const availability = await (self as any).Translator.availability({
        sourceLanguage: "en",
        targetLanguage: "fr",
      });
      console.log("[Onboarding] French Translator availability:", availability);

      setStatus("Downloading French translation engine...");

      const frenchTranslator = await (self as any).Translator.create({
        sourceLanguage: "en",
        targetLanguage: "fr",
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progressValue = (e.loaded / e.total) * 100;
            console.log(`[Onboarding] French translator download progress: ${progressValue.toFixed(1)}%`);
            setProgress((prev) => ({ ...prev, french: progressValue }));
          });
        },
      });

      console.log("[Onboarding] French Translator created successfully:", frenchTranslator);
      setProgress((prev) => ({ ...prev, french: 100 }));

      // Don't destroy - this would remove the downloaded model from cache
      // frenchTranslator.destroy();

      // Mark as downloaded
      await storageService.setLanguageDownloaded("french");
      console.log("[Onboarding] ✅ French translator downloaded and marked as complete");

      setStatus("French translator downloaded! Click Next to continue.");
      // Don't auto-advance - let user click Next
    } catch (err) {
      console.error("Error downloading French translator:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Download failed");
    }
  };

  const downloadSpanishModel = async () => {
    try {
      console.log("[Onboarding] Starting Spanish translator download...");

      // Check availability first
      const availability = await (self as any).Translator.availability({
        sourceLanguage: "en",
        targetLanguage: "es",
      });
      console.log("[Onboarding] Spanish Translator availability:", availability);

      setStatus("Downloading Spanish translation engine...");

      const spanishTranslator = await (self as any).Translator.create({
        sourceLanguage: "en",
        targetLanguage: "es",
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progressValue = (e.loaded / e.total) * 100;
            console.log(`[Onboarding] Spanish translator download progress: ${progressValue.toFixed(1)}%`);
            setProgress((prev) => ({ ...prev, spanish: progressValue }));
          });
        },
      });

      console.log("[Onboarding] Spanish Translator created successfully:", spanishTranslator);
      setProgress((prev) => ({ ...prev, spanish: 100 }));

      // Don't destroy - this would remove the downloaded model from cache
      // spanishTranslator.destroy();

      // Mark as downloaded
      await storageService.setLanguageDownloaded("spanish");
      console.log("[Onboarding] ✅ Spanish translator downloaded and marked as complete");

      setStatus("Spanish translator downloaded! Click Next to continue.");
      // Don't auto-advance - let user click Next
    } catch (err) {
      console.error("Error downloading Spanish translator:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Download failed");
    }
  };

  const downloadRewriterModel = async () => {
    try {
      console.log("[Onboarding] Starting Rewriter download...");

      // Check availability first
      const availability = await (self as any).Rewriter.availability();
      console.log("[Onboarding] Rewriter availability:", availability);

      setStatus("Downloading text rewriter engine...");

      const rewriter = await (self as any).Rewriter.create({
        tone: "as-is",
        format: "plain-text",
        length: "as-is",
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progressValue = (e.loaded / e.total) * 100;
            console.log(`[Onboarding] Rewriter download progress: ${progressValue.toFixed(1)}%`);
            setProgress((prev) => ({ ...prev, rewriter: progressValue }));
          });
        },
      });

      console.log("[Onboarding] Rewriter created successfully:", rewriter);
      setProgress((prev) => ({ ...prev, rewriter: 100 }));

      // Don't destroy - this would remove the downloaded model from cache
      // rewriter.destroy();

      // Mark as downloaded
      await storageService.setRewriterDownloaded();
      console.log("[Onboarding] ✅ Rewriter downloaded and marked as complete");

      setStatus("Finalizing setup...");

      // Save configuration with selected language as active
      const existingConfig = await chrome.storage.local.get("config");
      await chrome.storage.local.set({
        config: {
          ...(existingConfig.config || {}),
          activeLanguage: selectedLanguage,
          difficulty: "beginner",
          density: "high",
          translationEnabled: true,
        },
      });

      // Update system info (merge, don't overwrite)
      const existingSystem = await chrome.storage.local.get("system");
      const system = existingSystem.system || {};
      system.onboardingComplete = true;
      if (!system.setupDate) {
        system.setupDate = new Date().toISOString();
      }
      await chrome.storage.local.set({ system });

      console.log(
        "Onboarding complete! All models downloaded."
      );

      // Show success screen
      setScreen("success");
    } catch (err) {
      console.error("Error downloading Rewriter:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Download failed");
    }
  };

  // Countdown effect for success screen
  useEffect(() => {
    if (screen === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (screen === "success" && countdown === 0) {
      window.close();
    }
  }, [screen, countdown]);

  // Calculate overall progress
  const overallProgress = Math.round(
    (progress.prompt + progress.french + progress.spanish) / 3
  );

  return (
    <div className="onboarding-container">
      {screen === "welcome" && (
        <div className="screen">
          <div className="icon">🌍</div>
          <h1>Welcome to Language Learning!</h1>
          <p className="subtitle">
            Learn new languages naturally while browsing the web
          </p>

          {/* Language Selection */}
          <div className="language-selection">
            <h3>Which language do you want to start with?</h3>
            <p className="language-note">
              We'll download all necessary AI models (4 downloads total)
            </p>
            <div className="language-buttons">
              {Object.entries(SUPPORTED_LANGUAGES).map(([key, info]) => (
                <button
                  key={key}
                  className={`language-btn ${
                    selectedLanguage === key ? "selected" : ""
                  }`}
                  onClick={() => setSelectedLanguage(key as SupportedLanguage)}
                >
                  <span className="language-flag">{info.flag}</span>
                  <span className="language-name">{info.displayName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="features">
            <div className="feature">
              <span className="feature-icon">✨</span>
              <div>
                <h3>Smart Translation</h3>
                <p>AI selects the right words for your level</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <div>
                <h3>Learn in Context</h3>
                <p>See translations while reading real content</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🔊</span>
              <div>
                <h3>Pronunciation</h3>
                <p>Hear how words are pronounced</p>
              </div>
            </div>
          </div>

          <button onClick={handleGetStarted} className="primary-btn">
            Download & Get Started
          </button>
        </div>
      )}

      {screen === "download-prompt" && (
        <div className="screen">
          <div className="icon">⚡</div>
          <h1>Download Word Selection AI</h1>
          <p className="subtitle">
            Step 1 of 4: This AI intelligently selects words for you to learn
          </p>

          {!error && (
            <div className="progress-container">
              <div className="progress-item">
                <div className="progress-header">
                  <span>Word Selection AI</span>
                  <span>{Math.round(progress.prompt)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.prompt}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <p className={`status ${error ? "error" : ""}`}>{status}</p>

          {!error && progress.prompt === 0 && (
            <button onClick={downloadPromptModel} className="primary-btn">
              Start Download
            </button>
          )}

          {!error && progress.prompt === 100 && (
            <button onClick={() => setScreen("download-french")} className="primary-btn">
              Next: Download French
            </button>
          )}

          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setScreen("welcome");
                }}
                className="retry-btn"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "download-french" && (
        <div className="screen">
          <div className="icon">🇫🇷</div>
          <h1>Download French Translator</h1>
          <p className="subtitle">
            Step 2 of 4: French translation model
          </p>

          {!error && (
            <div className="progress-container">
              <div className="progress-item">
                <div className="progress-header">
                  <span>🇫🇷 French Translation</span>
                  <span>{Math.round(progress.french)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.french}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <p className={`status ${error ? "error" : ""}`}>{status}</p>

          {!error && progress.french === 0 && (
            <button onClick={downloadFrenchModel} className="primary-btn">
              Download French
            </button>
          )}

          {!error && progress.french === 100 && (
            <button onClick={() => setScreen("download-spanish")} className="primary-btn">
              Next: Download Spanish
            </button>
          )}

          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setScreen("download-prompt");
                }}
                className="retry-btn"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "download-spanish" && (
        <div className="screen">
          <div className="icon">🇪🇸</div>
          <h1>Download Spanish Translator</h1>
          <p className="subtitle">
            Step 3 of 4: Spanish translation model
          </p>

          {!error && (
            <div className="progress-container">
              <div className="progress-item">
                <div className="progress-header">
                  <span>🇪🇸 Spanish Translation</span>
                  <span>{Math.round(progress.spanish)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.spanish}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <p className={`status ${error ? "error" : ""}`}>{status}</p>

          {!error && progress.spanish === 0 && (
            <button onClick={downloadSpanishModel} className="primary-btn">
              Download Spanish
            </button>
          )}

          {!error && progress.spanish === 100 && (
            <button onClick={() => setScreen("download-rewriter")} className="primary-btn">
              Next: Download Rewriter
            </button>
          )}

          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setScreen("download-french");
                }}
                className="retry-btn"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "download-rewriter" && (
        <div className="screen">
          <div className="icon">✍️</div>
          <h1>Download Text Rewriter</h1>
          <p className="subtitle">
            Step 4 of 4: AI-powered text simplification and rewriting
          </p>

          {!error && (
            <div className="progress-container">
              <div className="progress-item">
                <div className="progress-header">
                  <span>✍️ Text Rewriter</span>
                  <span>{Math.round(progress.rewriter)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.rewriter}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <p className={`status ${error ? "error" : ""}`}>{status}</p>

          {!error && progress.rewriter === 0 && (
            <button onClick={downloadRewriterModel} className="primary-btn">
              Download Rewriter
            </button>
          )}

          {!error && progress.rewriter === 100 && (
            <p className="status">Rewriter downloaded! Setup complete.</p>
          )}

          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setScreen("download-spanish");
                }}
                className="retry-btn"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "success" && (
        <div className="screen">
          <div className="icon success">✓</div>
          <h1>You're All Set!</h1>
          <p className="subtitle">You can now learn French and Spanish!</p>

          <div className="success-languages">
            <div className="success-language">
              <span className="success-flag">🇫🇷</span>
              <span className="success-name">French</span>
            </div>
            <div className="success-language">
              <span className="success-flag">🇪🇸</span>
              <span className="success-name">Spanish</span>
            </div>
          </div>

          <div className="tip">
            <strong>💡 Tip:</strong> Use the extension icon to switch between
            languages or toggle translation on/off anytime
          </div>

          <p className="auto-close">
            This page will close in{" "}
            <span className="countdown">{countdown}</span> seconds...
          </p>
        </div>
      )}
    </div>
  );
}
