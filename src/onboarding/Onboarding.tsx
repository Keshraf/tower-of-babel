import { useState, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  getLanguageCode,
} from "../content/utils/translationConfig";
import { storageService } from "../content/services/StorageService";

type Screen = "welcome" | "download" | "success";

interface DownloadProgress {
  prompt: number;
  french: number;
  spanish: number;
}

export default function Onboarding() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>("french");
  const [progress, setProgress] = useState<DownloadProgress>({
    prompt: 0,
    french: 0,
    spanish: 0,
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
    setScreen("download");
    await downloadModels();
  };

  const downloadModels = async () => {
    try {
      // Check if APIs are available
      if (!("LanguageModel" in self) || !("Translator" in self)) {
        throw new Error(
          "AI APIs not available. Please enable Chrome Built-in AI at chrome://flags/#optimization-guide-on-device-model"
        );
      }

      // Check what's already downloaded
      const downloadedLanguages = await storageService.getDownloadedLanguages();
      const isPromptDownloaded = downloadedLanguages.length > 0; // If any language downloaded, Prompt API is ready

      // Step 1: Download Prompt API (if not already downloaded)
      if (!isPromptDownloaded) {
        setStatus("Downloading word selection AI...");
        const languageModelParams = await (self as any).LanguageModel.params();

        const languageModel = await (self as any).LanguageModel.create({
          temperature: languageModelParams.defaultTemperature,
          topK: languageModelParams.defaultTopK,
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              const progressValue = (e.loaded / e.total) * 100;
              setProgress((prev) => ({ ...prev, prompt: progressValue }));
            });
          },
        });

        setProgress((prev) => ({ ...prev, prompt: 100 }));
        languageModel.destroy();
        console.log("Prompt API downloaded");
      } else {
        // Already downloaded, set to 100%
        setProgress((prev) => ({ ...prev, prompt: 100 }));
        console.log("Prompt API already downloaded");
      }

      // Step 2: Download French Translator (if not already downloaded)
      if (!downloadedLanguages.includes("french")) {
        setStatus("Downloading French translation engine...");

        const frenchTranslator = await (self as any).Translator.create({
          sourceLanguage: "en",
          targetLanguage: "fr",
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              const progressValue = (e.loaded / e.total) * 100;
              setProgress((prev) => ({ ...prev, french: progressValue }));
            });
          },
        });

        setProgress((prev) => ({ ...prev, french: 100 }));
        frenchTranslator.destroy();

        // Mark as downloaded
        await storageService.setLanguageDownloaded("french");
        console.log("French translator downloaded");
      } else {
        // Already downloaded, set to 100%
        setProgress((prev) => ({ ...prev, french: 100 }));
        console.log("French translator already downloaded");
      }

      // Step 3: Download Spanish Translator (if not already downloaded)
      if (!downloadedLanguages.includes("spanish")) {
        setStatus("Downloading Spanish translation engine...");

        const spanishTranslator = await (self as any).Translator.create({
          sourceLanguage: "en",
          targetLanguage: "es",
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              const progressValue = (e.loaded / e.total) * 100;
              setProgress((prev) => ({ ...prev, spanish: progressValue }));
            });
          },
        });

        setProgress((prev) => ({ ...prev, spanish: 100 }));
        spanishTranslator.destroy();

        // Mark as downloaded
        await storageService.setLanguageDownloaded("spanish");
        console.log("Spanish translator downloaded");
      } else {
        // Already downloaded, set to 100%
        setProgress((prev) => ({ ...prev, spanish: 100 }));
        console.log("Spanish translator already downloaded");
      }

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
        "Onboarding complete! Both French and Spanish models downloaded."
      );

      // Show success screen
      setScreen("success");
    } catch (err) {
      console.error("Error during onboarding:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Setup failed");
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
              We'll download both French and Spanish, so you can switch anytime!
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

      {screen === "download" && (
        <div className="screen">
          <div className="icon">⚡</div>
          <h1>Setting Up AI Models</h1>
          <p className="subtitle">
            {error
              ? "Setup failed"
              : `Downloading translation models... (${overallProgress}% complete)`}
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

          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button
                onClick={() => setScreen("welcome")}
                className="retry-btn"
              >
                Try Again
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
