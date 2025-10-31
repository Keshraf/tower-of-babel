// Open onboarding page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First time installation
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/onboarding/index.html"),
    });
  } else if (details.reason === "update") {
    // Extension updated
    console.log(
      "Extension updated to version",
      chrome.runtime.getManifest().version
    );
  }
});

// Listen for toggle changes from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_CHANGED") {
    console.log("Translation toggled:", message.enabled);

    // Broadcast to all tabs to update their state
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "UPDATE_TRANSLATION_STATE",
              enabled: message.enabled,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            });
        }
      });
    });
  }

  if (message.type === "LANGUAGE_CHANGED") {
    console.log("Language changed:", message.language);

    // Broadcast to all tabs to switch language
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "LANGUAGE_CHANGED",
              language: message.language,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            });
        }
      });
    });
  }

  sendResponse({ success: true });
  return true;
});
