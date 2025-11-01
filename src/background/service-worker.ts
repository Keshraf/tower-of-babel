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

  // Create context menu items for text translation
  chrome.contextMenus.create({
    id: "translate-selection",
    title: "Translate",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "simplify-translate-selection",
    title: "Simplify & Translate",
    contexts: ["selection"],
  });

  console.log("Context menu items created");
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (
    (info.menuItemId === "translate-selection" ||
      info.menuItemId === "simplify-translate-selection") &&
    tab?.id
  ) {
    const shouldSimplify = info.menuItemId === "simplify-translate-selection";
    console.log(
      `Context menu clicked (${shouldSimplify ? "Simplify & Translate" : "Translate"}), selected text:`,
      info.selectionText
    );

    try {
      // Get active language from storage
      const result = await chrome.storage.local.get("config");
      const config = result.config || {};
      const activeLanguage = config.activeLanguage || "french";

      // Send message to content script to translate the selected text
      await chrome.tabs.sendMessage(tab.id, {
        type: "TRANSLATE_SELECTION",
        text: info.selectionText,
        language: activeLanguage,
        simplify: shouldSimplify,
      });

      console.log(
        `Sent ${shouldSimplify ? "simplify & translate" : "translate"} request for "${info.selectionText}" to ${activeLanguage}`
      );
    } catch (error) {
      console.error("Error handling context menu click:", error);
    }
  }
});
