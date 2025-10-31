import { useState, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type LanguageStats,
} from "../content/utils/translationConfig";
import { storageService } from "../content/services/StorageService";
import { MixedQuizView } from "./components/MixedQuizView";
import { SettingsView } from "./components/SettingsView";
import { Button } from "../components/ui/button";
import {
  Globe,
  Power,
  PowerOff,
  BookOpen,
  FileText,
  Brain,
  Settings,
} from "lucide-react";

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
  const [showQuiz, setShowQuiz] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      <div className="flex items-center justify-center w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showQuiz) {
    return (
      <div className="w-full min-h-screen bg-white">
        <MixedQuizView
          language={state.activeLanguage}
          onBack={() => setShowQuiz(false)}
        />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="w-full min-h-screen bg-white">
        <SettingsView onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/public/Logo.png"
            alt="Tower of Babel"
            className="w-8 h-8"
          />
          <h1 className="text-lg font-bold text-gray-900">Tower of Babel</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Language Selector Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Learning Language
          </label>
          <select
            value={state.activeLanguage}
            onChange={(e) =>
              handleLanguageChange(e.target.value as SupportedLanguage)
            }
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.flag} {info.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Translation Toggle Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.translationEnabled ? (
                <Power className="w-5 h-5 text-green-600" />
              ) : (
                <PowerOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Translation
                </h2>
                <p
                  className={`text-xs ${
                    state.translationEnabled
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {state.translationEnabled ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(!state.translationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                state.translationEnabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  state.translationEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Your Progress
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">Words</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalWordsEncountered}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-gray-600">Pages</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalPagesTranslated}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => setShowQuiz(true)}
            variant="default"
            className="w-full gap-2 h-11"
          >
            <Brain className="w-5 h-5" />
            Practice Quiz
          </Button>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="w-full gap-2 h-11"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-center">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Help & Feedback
        </a>
      </div>
    </div>
  );
}

export default App;
