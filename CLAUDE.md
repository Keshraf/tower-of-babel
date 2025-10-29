# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tower of Babel is a Chrome extension built with React + TypeScript + Vite that translates web page content progressively. It uses CRXJS for Chrome extension development and implements a language learning tool with interactive tooltips and text-to-speech.

## IMPORTANT PROJECT INFORMATION

Our projects lets you: Learn languages naturally while browsing the web you love

So it basically uses Chrome' built in AI APIs to convert some words / sentences on the website the user is browsing and then the user can hover and learn the meaning of that word. There will be additional things as well.

## Commands

**Development:**

```bash
pnpm dev               # Start Vite dev server, auto-reloads on changes
pnpm build             # TypeScript compile + production build
pnpm preview           # Preview production build
```

**Testing the extension:**

1. Run `pnpm dev`
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Load unpacked extension from `dist/` directory

**Note:** Uses pnpm for package management (see `pnpm-lock.yaml`)

## Architecture

### Extension Structure

The extension has three distinct UI contexts managed by CRXJS:

1. **Content Script** (`src/content/main.tsx`): Injected into all HTTPS pages

   - Identifies translatable content using smart selectors (articles, main content)
   - Wraps translated words in interactive `<span>` elements with hover tooltips
   - Uses `tooltipState` singleton for cross-component communication
   - Implements progressive loading via `ProgressiveTextLoader` (IntersectionObserver)

2. **Popup** (`src/popup/`): Browser action popup UI
3. **Side Panel** (`src/sidepanel/`): Chrome side panel interface

### Key Systems

**Progressive Translation Pipeline:**

1. `getContentElements()` finds article/main content, excludes nav/headers/footers
2. Splits into visible vs. hidden elements based on viewport
3. Processes visible content immediately
4. Uses IntersectionObserver to translate hidden content as it scrolls into view

**Text Processing:**

- `textExtraction.ts`: Contains INCLUDE_SELECTORS (article p, main p, headings) and EXCLUDE_SELECTORS (nav, footer, code blocks)
- DOM text nodes are split by whitespace, wrapped in `<span>` with data attributes
- Translation currently mocked in `translateToFrench()` - TODO: integrate Chrome AI API

**Tooltip System:**

- `TooltipPortal.tsx`: React component rendered in `document.body`
- `tooltipState`: Shared state using observer pattern (listeners Set)
- TTS integration via Web Speech API in `tts.ts`

### Build Configuration

- **Vite config** (`vite.config.ts`):

  - Path alias: `@` → `src/`
  - Plugins: React, Tailwind CSS v4, CRXJS, zip-pack (for releases)
  - CORS enabled for chrome-extension:// origins

- **Manifest** (`manifest.config.ts`):
  - MV3, permissions: sidePanel, contentSettings
  - Content script runs on all HTTPS pages
  - Popup + side panel configured

### Important Files

- `src/content/main.tsx`: Entry point for content script, manages translation lifecycle
- `src/content/utils/textExtraction.ts`: Content selection and progressive loading logic
- `src/content/utils/tts.ts`: Text-to-speech helpers
- `src/components/TooltipPortal.tsx`: Hover tooltip UI component

## Development Notes

- Translation logic is currently mocked - integrate actual translation API at `translateToFrench()` in `src/content/main.tsx:84`
- Tailwind CSS v4 is configured via `@tailwindcss/vite` plugin
- Uses React 19 with TypeScript strict mode
- CRXJS handles HMR and automatic manifest generation from `manifest.config.ts`
