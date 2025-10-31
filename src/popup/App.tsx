import { useState, useEffect } from "react";
import "./App.css";

interface StorageState {
  modelsDownloaded: boolean;
  translationEnabled: boolean;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<StorageState>({
    modelsDownloaded: false,
    translationEnabled: true,
  });

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const result = await chrome.storage.local.get([
        "modelsDownloaded",
        "translationEnabled",
      ]);

      const modelsDownloaded = result.modelsDownloaded || false;
      const translationEnabled = result.translationEnabled !== false;

      setState({
        modelsDownloaded,
        translationEnabled,
      });

      // If models not downloaded, redirect to onboarding
      if (!modelsDownloaded) {
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
      await chrome.storage.local.set({ translationEnabled: enabled });

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

        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Words Learned</span>
            <span className="stat-value">0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pages Translated</span>
            <span className="stat-value">0</span>
          </div>
        </div>

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
