import { useState, useEffect } from "react";

type Screen = "welcome" | "download" | "success";

interface DownloadProgress {
  prompt: number;
  translator: number;
}

export default function Onboarding() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [progress, setProgress] = useState<DownloadProgress>({
    prompt: 0,
    translator: 0,
  });
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

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

      // Download Prompt API model
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

      // Download Translator API model
      setStatus("Downloading translation engine...");

      const translator = await (self as any).Translator.create({
        sourceLanguage: "en",
        targetLanguage: "fr",
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progressValue = (e.loaded / e.total) * 100;
            setProgress((prev) => ({ ...prev, translator: progressValue }));
          });
        },
      });

      setProgress((prev) => ({ ...prev, translator: 100 }));
      setStatus("Finalizing setup...");

      // Clean up
      languageModel.destroy();
      translator.destroy();

      // Save to storage
      await chrome.storage.local.set({
        modelsDownloaded: true,
        translationEnabled: true, // Default to enabled
        onboardingComplete: true,
        setupDate: new Date().toISOString(),
      });

      console.log("Onboarding complete! Models downloaded.");

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

  return (
    <div className="onboarding-container">
      {screen === "welcome" && (
        <div className="screen">
          <div className="icon">🌍</div>
          <h1>Welcome to Language Learning!</h1>
          <p className="subtitle">
            Learn new languages naturally while browsing the web
          </p>

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
            Get Started
          </button>
        </div>
      )}

      {screen === "download" && (
        <div className="screen">
          <div className="icon">⚡</div>
          <h1>Setting Up AI Models</h1>
          <p className="subtitle">
            {error ? "Setup failed" : "This will only take a minute..."}
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
                  <span>Translation Engine</span>
                  <span>{Math.round(progress.translator)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.translator}%` }}
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
          <p className="subtitle">Start browsing to begin learning</p>

          <div className="tip">
            <strong>💡 Tip:</strong> Use the extension icon to toggle
            translation on/off anytime
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
