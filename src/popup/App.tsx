import { useState, useEffect } from "react";
import "./App.css";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type LanguageStats,
} from "../content/utils/translationConfig";
import { storageService } from "../content/services/StorageService";

interface StorageState {
  onboardingComplete: boolean;
  translationEnabled: boolean;
  activeLanguage: SupportedLanguage;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<StorageState>({
    onboardingComplete: false,
    translationEnabled: true,
    activeLanguage: "french",
  });
  const [stats, setStats] = useState<LanguageStats>({
    totalWordsEncountered: 0,
    totalPagesTranslated: 0,
    lastActiveDate: new Date().toISOString(),
  });

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const result = await chrome.storage.local.get(["config", "system"]);

      const config = result.config || {};
      const system = result.system || {};

      const activeLanguage: SupportedLanguage =
        config.activeLanguage || "french";
      const translationEnabled = config.translationEnabled !== false;
      const onboardingComplete = system.onboardingComplete || false;

      setState({
        onboardingComplete,
        translationEnabled,
        activeLanguage,
      });

      // Load stats for active language
      const languageStats = await storageService.getStats(activeLanguage);
      setStats(languageStats);

      // If onboarding not complete, redirect to onboarding
      if (!onboardingComplete) {
        chrome.tabs.create({
          url: chrome.runtime.getURL("src/onboarding/index.html"),
        });
        window.close();
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading state:", error);
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      // Save to storage
      const result = await chrome.storage.local.get("config");
      const config = result.config || {};
      config.translationEnabled = enabled;
      await chrome.storage.local.set({ config });

      // Update local state
      setState((prev) => ({ ...prev, translationEnabled: enabled }));

      // Notify background script
      chrome.runtime.sendMessage({
        type: "TOGGLE_CHANGED",
        enabled,
      });

      console.log("Translation", enabled ? "enabled" : "disabled");
    } catch (error) {
      console.error("Error toggling translation:", error);
    }
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    try {
      console.log(`Switching to ${language}...`);

      // Update config in storage
      const result = await chrome.storage.local.get("config");
      const config = result.config || {};
      config.activeLanguage = language;
      await chrome.storage.local.set({ config });

      // Update local state
      setState((prev) => ({ ...prev, activeLanguage: language }));

      // Load stats for new language
      const newStats = await storageService.getStats(language);
      setStats(newStats);

      // Notify background script (which will notify all content scripts)
      chrome.runtime.sendMessage({
        type: "LANGUAGE_CHANGED",
        language,
      });

      console.log(`Switched to ${language}`);
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="header">
        <div className="logo">
          <span className="icon">🌍</span>
          <h1>Language Learning</h1>
        </div>
      </header>

      <div className="content">
        {/* Language Selector */}
        <div className="language-selector">
          <label htmlFor="language-select">Learning Language</label>
          <select
            id="language-select"
            value={state.activeLanguage}
            onChange={(e) =>
              handleLanguageChange(e.target.value as SupportedLanguage)
            }
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.flag} {info.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Section */}
        <div className="toggle-section">
          <div className="toggle-info">
            <h2>Translation</h2>
            <p
              className={`toggle-status ${
                !state.translationEnabled ? "disabled" : ""
              }`}
            >
              {state.translationEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={state.translationEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Words Learned</span>
            <span className="stat-value">{stats.totalWordsEncountered}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pages Translated</span>
            <span className="stat-value">{stats.totalPagesTranslated}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button
            className="action-btn"
            onClick={() => console.log("Settings")}
          >
            <span>⚙️</span>
            Settings
          </button>
          <button
            className="action-btn"
            onClick={() => console.log("Practice")}
          >
            <span>📝</span>
            Practice Quiz
          </button>
        </div>
      </div>

      <footer className="footer">
        <a href="#" onClick={(e) => e.preventDefault()}>
          Help & Feedback
        </a>
      </footer>
    </div>
  );
}

export default App;
