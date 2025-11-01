# Tower of Babel - Learn While You Browse

Tower of Babel is an intelligent Chrome extension that transforms any webpage into an immersive language learning environment. Using Chrome's revolutionary Built-in AI capabilities, it seamlessly weaves language learning into your daily web browsing, no textbooks, no separate apps, just natural learning in context.

> **The Legend Behind the Name**
>
> In ancient Mesopotamia, humanity united to build a tower reaching the heavens: the Tower of Babel. According to legend, this ambition led to the confusion of languages, scattering people across the earth, unable to understand one another. Our Tower of Babel seeks to reverse this ancient curse. Where the original tower divided humanity through linguistic confusion, our extension reunites us—transforming that same diversity of language from a barrier into a bridge, one webpage at a time.

## 🌟 Key Features

- **Intelligent Word Selection**: AI-powered vocabulary selection based on your skill level using Chrome's Prompt API (Gemini Nano)
- **Seamless Page Translation**: Automatic translation of selected words while preserving page layout using Chrome's Translation API
- **Interactive Word Cards**: Hover over translated words to see definitions, AI-generated contextual examples, and hear native pronunciation
- **Context Menu Translation**: Right-click any text for instant translation or simplified translation using Chrome's Rewriter API
- **Built-in Quiz System**: Test your knowledge with AI-generated multiple-choice questions and pronunciation practice
- **Image Translation**: Multimodal AI identifies and translates text in images
- **Pronunciation Validation**: Record yourself speaking and get AI-powered feedback on your pronunciation
- **Multi-Language Support**: Currently supports French (🇫🇷) and Spanish (🇪🇸)
- **100% Offline & Private**: All AI processing happens locally in your browser—no data sent to servers

## 🎯 Why Tower of Babel?

Traditional language learning apps disconnect learning from real-world content. Tower of Babel bridges this gap by turning every article, blog post, and website you visit into a personalized language lesson. Learn vocabulary in meaningful context, not isolated flashcards.

**What makes it unique:**

- First Chrome extension to integrate all 5 Chrome Built-in AI APIs
- Context-aware learning that adapts to what you're reading
- Progressive loading handles pages of any size without slowdown
- Works on any website—news, social media, documentation, shopping sites

## ⚡ Prerequisites

Before installing Tower of Babel, ensure your system meets the following requirements:

### 1. Google Chrome Version

- Install **Chrome Dev channel** (or Canary channel)
- Version must be **≥ 131.0.6778.0**
- [Download Chrome Dev](https://www.google.com/chrome/dev/)

### 2. System Requirements

- Minimum **22 GB of free storage space** for AI models
- **Note**: If available storage falls below 10 GB after download, models will be automatically deleted
- For macOS users: Use Disk Utility to check accurate free disk space

### 3. Supported Languages

- Currently supports:
  - English → French (fr-FR)
  - English → Spanish (es-ES)
- Both language models are downloaded during onboarding

### 4. Policy Acknowledgment

- Review and acknowledge [Google's Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy)

## 🚀 Installation

### Step 1: Enable Chrome Built-in AI APIs

#### Enable Gemini Nano and Prompt API

1. Open Chrome and navigate to `chrome://flags/#optimization-guide-on-device-model`
2. Select **"Enabled BypassPerfRequirement"**
   - This bypasses performance checks that might prevent Gemini Nano download
3. Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
4. Select **"Enabled"**

#### Enable Translation API

5. Navigate to `chrome://flags/#translation-api`
6. Select **"Enabled"**

#### Enable Rewriter API

7. Navigate to `chrome://flags/#rewriter-api-for-gemini-nano`
8. Select **"Enabled"**

#### Enable Multimodal Capabilities

9. Navigate to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
10. Select **"Enabled"**

#### Relaunch Chrome

11. Click **"Relaunch"** to apply all changes

### Step 2: Verify AI Model Availability

1. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
2. Run the following in the Console to check Prompt API:

```javascript
await LanguageModel.availability();
```

Expected output: `"downloadable"` or `"available"`

Follow the guide here if needed: https://developer.chrome.com/docs/ai/get-started

### Step 3: Install Tower of Babel Extension

1. Clone the repository:

```bash
git clone https://github.com/Keshraf/tower-of-babel.git
cd tower-of-babel
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Open Chrome Dev/Canary
5. Navigate to `chrome://extensions/`
6. Enable **"Developer mode"** (toggle in top right)
7. Click **"Load unpacked"**
8. Select the `dist` directory inside the cloned `tower-of-babel` folder
9. The Tower of Babel icon should now appear in your Chrome toolbar

### Step 4: Complete Onboarding

1. Click the Tower of Babel icon in your toolbar
2. Follow the onboarding flow:
   - Choose your target language (French or Spanish)
   - Wait for language models to download (this may take a few minutes)
3. Once complete, you're ready to start learning!

## 💡 How to Use

### Basic Usage

1. **Navigate to any webpage** in English
2. **Click the Tower of Babel icon**
3. **Watch as words are intelligently translated** based on your skill level
4. **Hover over translated words** to see:
   - Full translation
   - AI-generated example sentences in context
   - Pronunciation (click the speaker icon)
   - Word statistics

### Context Menu Translation

1. **Select any text** on a webpage
2. **Right-click** to open the context menu
3. Choose:
   - **"Translate Selection"** - Direct translation
   - **"Simplify & Translate"** - First simplifies complex text, then translates

### Quiz Yourself

1. Click the Tower of Babel icon to open the popup panel
2. Click on Practice Quiz
3. Or, when hovering over individual you can click Practice Quiz

### Customize Your Experience

In the popup panel settings:

- **Skill Level**: Adjust difficulty (Beginner/Intermediate/Advanced)
- **Learning Density**: Control how many words are translated (Few/Moderate/Many)
- **Target Language**: Switch between French and Spanish
- **Auto-translate**: Toggle automatic translation on page load

## ⚙️ Features in Detail

### Intelligent Word Selection

Tower of Babel doesn't just translate everything—it uses AI to select words that:

- Match your skill level
- Have high learning value
- Are contextually important
- Challenge you without overwhelming

### Progressive Loading

- Instantly translates visible content
- Lazily processes off-screen content as you scroll
- Handles pages of any size without slowdown

### Image Translation

- Automatically identifies images with text
- Uses multimodal AI to extract and translate content
- Supports visual learners

### Pronunciation Validation

- Record yourself speaking words
- AI transcribes and compares to the target word
- Get instant feedback on accuracy

## 🔒 Privacy & Security

- **100% offline processing** using Chrome's Built-in AI
- **No data sent to external servers** - all AI runs locally
- **No tracking or analytics** - your learning is completely private
- **No account required** - everything stored locally in Chrome
- **Open source** - audit the code yourself

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Development Mode

```bash
npm run dev
```

This starts the development server with hot module replacement.

### Build for Production

```bash
npm run build
```

The built extension will be in the `dist` directory.

### Tech Stack

- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Vite** with CRXJS plugin for extension development
- **Radix UI** for accessible components
- **Chrome Built-in AI APIs**: Prompt, Translation, Rewriter, Multimodal (Image + Audio)

## ⚠️ Troubleshooting

### AI Models Not Downloading

**Problem**: Models show as "not available"

**Solution**:

1. Verify you have **>22 GB free disk space**
2. Check Chrome version is **≥ 131.0.6778.0**
3. Confirm all flags are set to "Enabled"
4. Relaunch Chrome completely (quit and reopen)
5. Wait a few minutes—models download in the background

### Translation Not Working

**Problem**: Words aren't being translated

**Solution**:

1. Open the side panel and check if onboarding is complete
2. Verify the page language is English (extension only translates from English)
3. Check that Translation API is enabled: `chrome://flags/#translation-api`
4. Try refreshing the page

### Extension Not Loading

**Problem**: Extension doesn't appear after loading unpacked

**Solution**:

1. Ensure you selected the `dist` directory, not the root directory
2. Check the Extensions page for error messages
3. Try rebuilding: `npm run build`
4. Verify all dependencies installed: `npm install`

### Pronunciation Recording Not Working

**Problem**: Can't record pronunciation

**Solution**:

1. Grant microphone permissions when prompted
2. Check Chrome has microphone access in system settings
3. Verify multimodal flag is enabled: `chrome://flags/#prompt-api-for-gemini-multimodal`

### Performance Issues

**Problem**: Page is slow after translation

**Solution**:

1. Lower learning density in settings (fewer words = better performance)
2. Disable auto-translate and manually trigger translation
3. Close other Chrome tabs to free up memory
4. Try a less complex webpage first

## 🗺️ Roadmap

- [ ] More language pairs (German, Italian, Portuguese, Japanese, Chinese)
- [ ] Spaced repetition system for long-term retention
- [ ] Grammar explanations using AI
- [ ] Export vocabulary lists
- [ ] Learning streaks and gamification
- [ ] Teacher dashboard for classroom use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Chrome's Built-in AI platform
- Inspired by immersion learning principles
- Special thanks to the Chrome team for making on-device AI accessible

## 📧 Support

For questions, issues, or feedback:

- Open an issue on GitHub
- Check existing issues for solutions
- Review the Troubleshooting section above

---

**Made with ❤️ for language learners everywhere**

_Learn naturally. Learn contextually. Learn while you browse._
