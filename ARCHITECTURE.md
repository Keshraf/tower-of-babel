# Tower of Babel - Architecture Documentation

## Overview

Tower of Babel is a Chrome extension that transforms web pages into immersive language learning environments. Built on Chrome's Built-in AI platform, it uses five different AI APIs to provide intelligent word selection, translation, simplification, image understanding, and pronunciation validation—all running locally in the browser.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Directory Structure](#directory-structure)
- [Core Components](#core-components)
- [Services Layer](#services-layer)
- [Translation Pipeline](#translation-pipeline)
- [Chrome Built-in AI Integration](#chrome-built-in-ai-integration)
- [Data Flow](#data-flow)
- [Storage Architecture](#storage-architecture)
- [Message Passing](#message-passing)
- [Extension Points & Events](#extension-points--events)

---

## High-Level Architecture

The extension follows a multi-layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  Background Service Worker (background/service-worker)  │
│  - Context menu management                               │
│  - Message routing between components                    │
│  - Onboarding orchestration                             │
├─────────────────────────────────────────────────────────┤
│  Content Script (content/main.tsx)                       │
│  - Page translation orchestration                        │
│  - DOM manipulation and observation                      │
│  - React UI for hover cards                             │
├─────────────────────────────────────────────────────────┤
│  Popup UI (popup/App.tsx)                               │
│  - Settings management                                   │
│  - Quiz interface                                        │
│  - Progress tracking                                     │
├─────────────────────────────────────────────────────────┤
│  Services Layer                                          │
│  - TranslationService (orchestrator)                     │
│  - TranslatorService (Translation API)                   │
│  - PromptService (Gemini Nano for word selection)       │
│  - RewriterService (text simplification)                 │
│  - ImageDescriptionService (multimodal AI)               │
│  - PronunciationService (audio transcription)            │
│  - QuizService (AI-generated questions)                  │
│  - StorageService (data persistence)                     │
├─────────────────────────────────────────────────────────┤
│  Chrome Built-in AI APIs (Local, On-Device)             │
│  - Prompt API (Gemini Nano)                             │
│  - Translation API                                       │
│  - Rewriter API                                          │
│  - Multimodal API (Image + Audio)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
tower-of-babel/
├── src/
│   ├── background/
│   │   └── service-worker.ts          # Background script for extension events
│   ├── content/
│   │   ├── main.tsx                   # Content script entry point
│   │   ├── selectionHandler.ts        # Context menu text selection handler
│   │   ├── components/                # React components for content script
│   │   │   ├── TooltipPortal.tsx      # Portal for hover card UI
│   │   │   ├── WordHoverCard.tsx      # Interactive word hover card
│   │   │   └── QuizView.tsx           # Quiz UI for individual words
│   │   ├── contexts/
│   │   │   └── TooltipContext.tsx     # React context for tooltip state
│   │   ├── services/                  # Core service layer
│   │   │   ├── TranslationService.ts  # Main orchestrator
│   │   │   ├── TranslatorService.ts   # Translation API wrapper
│   │   │   ├── PromptService.ts       # Prompt API (word selection)
│   │   │   ├── RewriterTranslationService.ts # Rewriter for page translation
│   │   │   ├── SelectionTranslationService.ts # Context menu translation
│   │   │   ├── ImageDescriptionService.ts # Image translation
│   │   │   ├── PronunciationService.ts # Audio transcription
│   │   │   ├── QuizService.ts         # Quiz generation
│   │   │   ├── ExampleSentenceService.ts # Example generation
│   │   │   └── StorageService.ts      # Data persistence
│   │   ├── translation/               # Translation pipeline
│   │   │   ├── pageTranslator.ts      # Orchestrates page translation
│   │   │   ├── nodeTranslator.ts      # Translates individual text nodes
│   │   │   ├── imageTranslator.ts     # Handles image translation
│   │   │   ├── translationState.ts    # Manages translation state
│   │   │   └── translationCleaner.ts  # Cleanup utilities
│   │   └── utils/                     # Utility functions
│   │       ├── translationConfig.ts   # Configuration types & defaults
│   │       ├── textExtraction.ts      # DOM text extraction
│   │       ├── rewriterAPI.ts         # Rewriter API utilities
│   │       └── tts.ts                 # Text-to-speech
│   ├── popup/
│   │   ├── App.tsx                    # Main popup UI
│   │   ├── components/
│   │   │   ├── MixedQuizView.tsx      # Quiz view with multiple types
│   │   │   └── SettingsView.tsx       # Settings panel
│   │   ├── index.html                 # Popup HTML entry
│   │   └── main.tsx                   # Popup entry point
│   ├── onboarding/
│   │   ├── Onboarding.tsx             # Onboarding flow
│   │   ├── index.html                 # Onboarding HTML
│   │   └── main.tsx                   # Onboarding entry point
│   ├── sidepanel/                     # Side panel (future use)
│   ├── permission/                    # Microphone permission handling
│   └── components/ui/                 # Shared UI components (Radix UI)
├── manifest.config.ts                 # Chrome extension manifest
├── vite.config.ts                     # Vite build configuration
└── package.json                       # Dependencies
```

---

## Core Components

### 1. Background Service Worker (`background/service-worker.ts`)

**Purpose**: Manages extension-wide events and coordinates between different parts of the extension.

**Key Responsibilities**:

- Creates context menu items for text translation on install
- Routes messages between popup, content scripts, and tabs
- Handles `TOGGLE_CHANGED` messages (enable/disable translation)
- Handles `LANGUAGE_CHANGED` messages (switch target language)
- Handles context menu clicks for "Translate" and "Simplify & Translate"
- Opens onboarding page on first install

**Message Flow**:

```
Popup → Background → All Content Scripts (broadcast)
Context Menu → Background → Active Tab Content Script
```

### 2. Content Script (`content/main.tsx`)

**Purpose**: The main entry point for content scripts injected into web pages.

**Key Responsibilities**:

- Initializes React app for hover cards (always mounted)
- Injects microphone permission iframe
- Checks if onboarding is complete and translation is enabled
- Initializes `TranslationService` and orchestrates page translation
- Listens for messages from background script:
  - `UPDATE_TRANSLATION_STATE`: Enable/disable translation
  - `LANGUAGE_CHANGED`: Switch language and re-translate
- Initializes selection handler for context menu translation

**Lifecycle**:

```
1. DOM Ready → Mount React (TooltipPortal)
2. Check onboarding & enabled state
3. If enabled → Initialize services → Translate page
4. Listen for state changes from popup
```

### 3. Selection Handler (`content/selectionHandler.ts`)

**Purpose**: Handles context menu-triggered translation of user-selected text.

**Key Responsibilities**:

- Listens for `TRANSLATE_SELECTION` messages from background script
- Uses `SelectionTranslationService` for translation with optional simplification
- Displays translation result in a modal or alert

### 4. Popup UI (`popup/App.tsx`)

**Purpose**: Main user interface for controlling the extension.

**Features**:

- Language selector (French/Spanish)
- Translation toggle (on/off)
- Progress statistics (words encountered, pages translated)
- Access to Practice Quiz
- Access to Settings

**State Management**:

- Reads from `chrome.storage.local` for config and stats
- Broadcasts changes to background script via `chrome.runtime.sendMessage`

---

## Services Layer

All services are singleton instances exported from their respective files.

### TranslationService (`services/TranslationService.ts`)

**Role**: Main orchestrator for translation functionality.

**Key Methods**:

- `initialize()`: Initializes both `PromptService` and `TranslatorService`
- `switchLanguage()`: Switches target language and re-initializes
- `selectWords()`: Uses Prompt API to intelligently select words to translate
- `translateSentences()`: Batch translates sentences using Translation API
- `reset()`: Resets service state

**Dependencies**: `PromptService`, `TranslatorService`, `StorageService`

### TranslatorService (`services/TranslatorService.ts`)

**Role**: Wrapper for Chrome's Translation API.

**Key Methods**:

- `initialize(sourceLanguage, targetLanguage)`: Creates translator instance
- `translate(text)`: Translates a single string
- `translateBatch(texts[])`: Batch translation with concurrency control

**API Used**: `Translator.availability()`, `Translator.create()`, `translator.translate()`

### PromptService (`services/PromptService.ts`)

**Role**: Uses Gemini Nano (Prompt API) for intelligent word selection.

**Key Methods**:

- `initialize(config)`: Creates prompt session with system instructions
- `selectWordsForTranslation(sentences[])`: Analyzes text and returns JSON of words to translate

**AI Capabilities**:

- Considers user's skill level (beginner/intermediate/advanced)
- Considers learning density (few/moderate/many words)
- Selects contextually important words
- Filters out common words that are too easy

**API Used**: `LanguageModel.create()`, `session.prompt()`

### SelectionTranslationService (`services/SelectionTranslationService.ts`)

**Role**: Handles context menu translation requests.

**Key Methods**:

- `translateSelectedText(text, language, simplify)`: Translates text with optional simplification
- `simplifyText(text)`: Simplifies complex English text using Rewriter API
- `translateText(text, language)`: Translates simplified or original text

**Workflow**:

```
User Selection → (Optional) Simplify → Translate → Display Result
```

### RewriterTranslationService (`services/RewriterTranslationService.ts`)

**Role**: Uses Rewriter API to process text during page translation.

**Key Methods**:

- `rewriteForTranslation(text)`: Simplifies text before translation (for better results)

**API Used**: `Rewriter.create()`, `rewriter.rewrite()`

### ImageDescriptionService (`services/ImageDescriptionService.ts`)

**Role**: Uses multimodal Prompt API to extract text from images.

**Key Methods**:

- `describeImage(imageElement)`: Analyzes image and returns extracted text
- `canDescribeImages()`: Checks if multimodal API is available

**API Used**: `LanguageModel.create()`, `session.prompt()` with image input

### PronunciationService (`services/PronunciationService.ts`)

**Role**: Validates user pronunciation using audio transcription.

**Key Methods**:

- `validatePronunciation(audioBlob, targetWord)`: Transcribes audio and compares to target word
- `recordPronunciation()`: Handles microphone recording

**API Used**: `LanguageModel.create()` with audio input

### QuizService (`services/QuizService.ts`)

**Role**: Generates AI-powered quiz questions.

**Key Methods**:

- `generateMultipleChoiceQuestion(word, translation)`: Creates quiz with distractors
- `generateMixedQuiz(words[])`: Creates a full quiz with multiple questions

### StorageService (`services/StorageService.ts`)

**Role**: Manages all data persistence in `chrome.storage.local`.

**Data Structure**:

```javascript
{
  config: {
    activeLanguage: "french" | "spanish",
    difficulty: "beginner" | "intermediate" | "advanced",
    density: "low" | "medium" | "high",
    translationEnabled: boolean
  },
  system: {
    onboardingComplete: boolean
  },
  french: {
    stats: { totalWordsEncountered, totalPagesTranslated, lastActiveDate },
    words: { [word]: { translation, encounters, lastSeen, ... } }
  },
  spanish: {
    stats: { ... },
    words: { ... }
  }
}
```

**Key Methods**:

- `getConfig()`, `updateConfig()`: Configuration management
- `getStats(language)`, `incrementStat()`: Statistics tracking
- `getWord()`, `addWord()`, `updateWord()`: Word tracking
- `getAllWords()`: Retrieve all learned words
- `setLanguageDownloaded()`: Track model downloads

---

## Translation Pipeline

The translation process follows a sophisticated multi-stage pipeline:

### Stage 1: Page Analysis (`translation/pageTranslator.ts`)

**Steps**:

1. Extract content elements using `getContentElements()`
2. Separate visible vs. hidden elements (viewport-based)
3. Extract text nodes from visible elements
4. Extract sentences from text nodes
5. Batch sentences into groups of 5

### Stage 2: Word Selection (`services/PromptService.ts`)

**Steps**:

1. Send batched sentences to Gemini Nano
2. AI analyzes sentences based on:
   - User's skill level
   - Learning density preference
   - Contextual importance
   - Word frequency
3. Returns JSON: `{ "word": { translation: "...", type: "..." } }`

### Stage 3: Translation (`translation/nodeTranslator.ts`)

**Steps**:

1. For each word selected, find all DOM text nodes containing it
2. Replace word with `<span class="translated-word">` wrapper
3. Store original text in `data-original` attribute
4. Translate word using Translation API
5. Update span with translation and metadata

### Stage 4: Progressive Loading (`utils/textExtraction.ts`)

**Steps**:

1. Set up IntersectionObserver for hidden elements
2. As user scrolls, newly visible elements are processed
3. Repeat stages 2-3 for lazy-loaded content

### Stage 5: Image Translation (`translation/imageTranslator.ts`)

**Steps**:

1. Find all `<img>` elements on page
2. Filter images likely to contain text (size, aspect ratio)
3. Use multimodal Prompt API to extract text
4. Translate extracted text
5. Display translation as overlay or tooltip

---

## Chrome Built-in AI Integration

Tower of Babel integrates **5 Chrome Built-in AI APIs**:

### 1. Prompt API (Gemini Nano)

**Use Cases**:

- Intelligent word selection based on context and skill level
- Quiz question generation
- Example sentence generation

**Key Features**:

- System instructions define AI behavior
- Streaming responses for real-time feedback
- JSON output for structured data

**Code Example**:

```typescript
const session = await ai.languageModel.create({
  systemPrompt: "You are a language learning assistant...",
  temperature: 0.7,
});

const result = await session.prompt("Select important words from: ...");
```

### 2. Translation API

**Use Cases**:

- Translating selected words and sentences
- Batch translation for efficiency

**Key Features**:

- High-quality neural machine translation
- Language pair support (en → fr, en → es)
- Offline operation

**Code Example**:

```typescript
const translator = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "fr",
});

const translation = await translator.translate("Hello world");
```

### 3. Rewriter API

**Use Cases**:

- Simplifying complex English text before translation
- Context menu "Simplify & Translate" feature

**Key Features**:

- Tone adjustment (formal/casual)
- Length control (shorter/longer)
- Shared context for consistency

**Code Example**:

```typescript
const rewriter = await Rewriter.create({
  tone: "more-casual",
  format: "plain-text",
  length: "shorter",
});

const simplified = await rewriter.rewrite(text);
```

### 4. Multimodal API (Image Input)

**Use Cases**:

- Extracting text from images for translation

**Key Features**:

- Image understanding with Gemini Nano
- Text extraction from photos, screenshots, diagrams

**Code Example**:

```typescript
const session = await ai.languageModel.create();
const result = await session.prompt("Extract all text from this image", {
  image: imageElement,
});
```

### 5. Multimodal API (Audio Input)

**Use Cases**:

- Pronunciation validation
- Speech-to-text transcription

**Key Features**:

- Audio transcription with Gemini Nano
- Pronunciation accuracy feedback

**Code Example**:

```typescript
const session = await ai.languageModel.create();
const result = await session.prompt("Transcribe this audio", {
  audio: audioBlob,
});
```

---

## Data Flow

### Translation Flow (Page Load)

```
1. User loads page
   ↓
2. Content script initializes
   ↓
3. Check onboarding & translation enabled
   ↓
4. Initialize TranslationService
   ↓
5. Download AI models (if needed)
   ↓
6. Extract sentences from visible content
   ↓
7. Prompt API selects words to translate
   ↓
8. Translation API translates words
   ↓
9. DOM updated with translated words
   ↓
10. IntersectionObserver watches for scroll
   ↓
11. Lazy load hidden content as user scrolls
```

### Context Menu Translation Flow

```
1. User selects text
   ↓
2. User right-clicks → "Translate" or "Simplify & Translate"
   ↓
3. Background script receives context menu click
   ↓
4. Background sends TRANSLATE_SELECTION message to content script
   ↓
5. SelectionTranslationService handles request
   ↓
6. (Optional) Rewriter API simplifies text
   ↓
7. Translation API translates text
   ↓
8. Result displayed in modal/alert
```

### Language Switch Flow

```
1. User changes language in popup
   ↓
2. Popup updates chrome.storage.local
   ↓
3. Popup sends LANGUAGE_CHANGED to background
   ↓
4. Background broadcasts to all tabs
   ↓
5. Content script receives message
   ↓
6. Stop current translation
   ↓
7. Clear existing translations from DOM
   ↓
8. Reset TranslationService
   ↓
9. Re-initialize with new language
   ↓
10. Re-translate page
```

---

## Storage Architecture

All data is stored in `chrome.storage.local` with a language-specific structure:

### Config Storage

```javascript
{
  config: {
    activeLanguage: "french",
    difficulty: "beginner",
    density: "high",
    translationEnabled: true
  }
}
```

### System Storage

```javascript
{
  system: {
    onboardingComplete: true;
  }
}
```

### Language Data Storage

Each language has its own namespace:

```javascript
{
  french: {
    stats: {
      totalWordsEncountered: 150,
      totalPagesTranslated: 12,
      lastActiveDate: "2025-01-15T10:30:00Z"
    },
    words: {
      "hello": {
        translation: "bonjour",
        wordType: "greeting",
        encounters: 5,
        lastSeen: "2025-01-15T10:30:00Z",
        sentence: "Hello, how are you?"
      }
    }
  },
  spanish: {
    stats: { ... },
    words: { ... }
  }
}
```

**Isolation**: Each language maintains completely separate word tracking and statistics.

---

## Message Passing

Tower of Babel uses Chrome's message passing for component communication:

### Message Types

| Message Type               | Direction                    | Purpose                          |
| -------------------------- | ---------------------------- | -------------------------------- |
| `TOGGLE_CHANGED`           | Popup → Background → Content | Enable/disable translation       |
| `LANGUAGE_CHANGED`         | Popup → Background → Content | Switch target language           |
| `TRANSLATE_SELECTION`      | Background → Content         | Context menu translation request |
| `UPDATE_TRANSLATION_STATE` | Background → Content         | Update translation enabled state |

### Example: Toggle Translation

**Popup → Background**:

```typescript
chrome.runtime.sendMessage({
  type: "TOGGLE_CHANGED",
  enabled: true,
});
```

**Background → All Tabs**:

```typescript
chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      type: "UPDATE_TRANSLATION_STATE",
      enabled: true,
    });
  });
});
```

**Content Script**:

```typescript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "UPDATE_TRANSLATION_STATE") {
    if (message.enabled) {
      initializeAndTranslate();
    } else {
      stopAndClearTranslations();
    }
  }
});
```

---

## Extension Points & Events

### Chrome Extension Lifecycle Events

| Event                           | Handler Location    | Purpose                               |
| ------------------------------- | ------------------- | ------------------------------------- |
| `chrome.runtime.onInstalled`    | Background          | Create context menus, open onboarding |
| `chrome.runtime.onMessage`      | Background, Content | Message routing                       |
| `chrome.contextMenus.onClicked` | Background          | Context menu translation              |
| `DOMContentLoaded`              | Content             | Initialize content script             |
| `chrome.storage.onChanged`      | Popup, Content      | React to storage updates              |

### Custom Events

- **Translation State Changes**: Managed via `translationState.ts` with AbortController
- **Progressive Loading**: IntersectionObserver in `ProgressiveTextLoader`
- **Tooltip Display**: React Context (`TooltipContext.tsx`)

---

## Key Design Patterns

### 1. Singleton Services

All services are singleton instances to avoid duplicate AI sessions:

```typescript
class TranslationService { ... }
export const translationService = new TranslationService();
```

### 2. Progressive Enhancement

- React UI always mounts (for hover cards)
- Translation only initializes if enabled
- Lazy loading for off-screen content

### 3. Separation of Concerns

- **Services**: AI integration and business logic
- **Translation**: DOM manipulation and orchestration
- **Components**: UI rendering
- **Utils**: Pure functions and helpers

### 4. Error Handling

- All AI operations wrapped in try-catch
- Graceful degradation (e.g., skip simplification if Rewriter fails)
- User-friendly error messages

### 5. Performance Optimization

- Batch processing (5 sentences per batch, 3 concurrent batches)
- IntersectionObserver for lazy loading
- AbortController for cancellable operations

---

## Contributing Guide

### Adding a New Language

1. Update `SUPPORTED_LANGUAGES` in `utils/translationConfig.ts`
2. Add BCP 47 language code mapping in `getLanguageCode()`
3. Ensure Translation API supports the language pair
4. Test model download and translation
5. Update documentation

### Adding a New Service

1. Create service file in `content/services/`
2. Implement singleton pattern
3. Add initialization logic with error handling
4. Export singleton instance
5. Document API in this file

### Modifying Translation Pipeline

1. Understand current flow (see Translation Pipeline section)
2. Identify insertion point (pageTranslator, nodeTranslator, etc.)
3. Preserve backward compatibility
4. Test with various page structures
5. Update architecture documentation

### Debugging Tips

- Enable verbose logging: Check console in content script context
- Inspect `chrome.storage.local`: Use Chrome DevTools → Application tab
- Test AI availability: Run `await LanguageModel.availability()` in console
- Monitor performance: Use Chrome DevTools → Performance tab

---

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with CRXJS plugin
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI (accessible primitives)
- **AI Platform**: Chrome Built-in AI (Gemini Nano)
- **Storage**: Chrome Storage API (Local)
- **Icons**: Lucide React

---

**For questions or contributions, please refer to the main README.md and open an issue on GitHub.**
