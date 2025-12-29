# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"更好的健保雲端 2.0 (NHI Extractor)" is a Chrome extension for extracting and analyzing patient data from Taiwan's National Health Insurance cloud system (medcloud2.nhi.gov.tw). The extension intercepts API calls, processes medical data (medications, lab results, imaging, etc.), and presents it in a user-friendly interface with AI-powered analysis capabilities.

## Build & Development Commands

### Installation
```bash
npm install --omit=dev
```

### Building
```bash
# Standard production build
npm run build

# Build + create distributable zip
npm run build:zip

# Build + create alpha version zip
npm run build:alpha

# Build for local testing (with sourcemaps)
npm test
```

### Development
```bash
# Run Vite dev server (for UI development)
npm run dev

# Preview built extension
npm preview
```

### Linting
```bash
# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Testing
After running `npm test`, use `node tests/serve.js` to start a local test server. The test build modifies manifest.json to include localhost permissions and adds sourcemaps.

## Architecture

### Chrome Extension Structure

This is a Manifest V3 Chrome extension with the following key components:

1. **Background Service Worker** (`src/background.js`)
   - Intercepts API requests to Taiwan NHI cloud system endpoints
   - Manages session data for medications, labs, imaging, allergies, surgery, discharge records
   - Routes requests to OpenAI or Google Gemini APIs for AI analysis
   - Handles schema adaptation between different AI providers

2. **Content Script** (`src/contentScript.jsx`)
   - Injected into medcloud2.nhi.gov.tw pages
   - Creates React mount point and loads FloatingIcon component
   - Imports legacy content script for backward compatibility

3. **Popup** (`src/popup.jsx`)
   - Small popup UI accessed from browser toolbar icon

### Build System

The project uses a hybrid build approach:
- **Vite** for React components and main application (`index.html`, `src/popup.jsx`)
- **esbuild** via `scripts/build.js` for bundling content script and background worker
  - Content script bundled as IIFE format for browser compatibility
  - Background script bundled separately
  - Both use `jsx: 'automatic'` transform

### Data Flow Architecture

```
NHI Cloud API → Background Worker (intercepts) → Content Script → React Components
                      ↓
              Session Data Store → Sidebar UI
                      ↓
              AI Provider (OpenAI/Gemini) → Analysis Results
```

**Data Processors** (`src/utils/*Processor.js`):
- Each medical data type has a dedicated processor module
- Processors handle data transformation, formatting, and validation
- Centralized via `dataManager.js` which orchestrates all processors

**Settings Management**:
- `settingsManager.js` provides centralized settings loading/saving via Chrome storage sync
- `config/defaultSettings.js` defines all default configuration values
- Settings are reactive and persist across sessions

### Component Organization

**Main Components** (`src/components/`):
- `FloatingIcon.jsx` - Main entry point, floating button overlay on NHI pages
- `Sidebar.jsx` - Resizable sidebar with AI analysis (GAI Sidebar feature)
- `PopupSettings.jsx` - Settings modal accessible from floating icon

**Tab Components** (`src/components/tabs/`):
- Each medical data category (medications, labs, imaging, etc.) has dedicated tab components
- `Overview.jsx` and `Overview_*.jsx` files provide dashboard views with tracked metrics
- Naming pattern: `{DataType}Data.jsx` for data display, `Overview_{Feature}.jsx` for dashboard widgets

**Settings Components** (`src/components/settings/`):
- Modular settings panels for different categories (General, Medication, Lab, Chinese Medicine, GAI, etc.)
- Each settings component manages its own storage sync operations

### AI Integration (GAI Feature)

The extension uses a **modular architecture** for AI provider integration, making it easy to add new AI services.

#### Modular Architecture (`src/services/gai/`)

**Provider System** (`providers/`):
- `BaseProvider.js` - Abstract base class defining unified API interface
- `OpenAIProvider.js` - OpenAI implementation (gpt-5-nano, strict JSON schema)
- `GeminiProvider.js` - Google Gemini implementation (gemini-3-flash-preview)
- `providerRegistry.js` - Provider registration and management system
- All providers implement the same `callAPI()` interface for consistency

**Prompt Management** (`prompts/`):
- `PromptManager.js` - Template management system
- `templates/defaultAnalysis.js` - Default analysis template with 4 categories
- Templates are versioned and can be extended independently

**Analysis Engine**:
- `AnalysisEngine.js` - Unified analysis execution with state tracking
- Supports single and batch (parallel) analysis
- Built-in performance monitoring and error handling

**Key Benefits**:
- **Easy extensibility**: Add new AI providers by extending `BaseProvider` (~80 lines)
- **Provider-agnostic**: Frontend code works with any registered provider
- **Backward compatible**: Existing code continues to work without changes
- **Dynamic UI**: Settings automatically show all registered providers

**Analysis Categories**:
- Critical alerts (urgent medical warnings)
- Medication risks (drug interactions, contraindications)
- Abnormal lab results
- Imaging findings

**Implementation Details**:
- System prompts and schemas in `prompts/templates/`
- Background worker routes requests through provider registry
- Automatic response format normalization (all providers return OpenAI-compatible format)
- Metrics tracking (tokens, execution time) for cost/performance monitoring
- XML generation via `gaiCopyFormatter.js` for structured AI input

**Adding a New Provider** (example):
```javascript
// 1. Create provider class (e.g., ClaudeProvider.js)
class ClaudeProvider extends BaseProvider {
  constructor() {
    super({ id: 'claude', name: 'Anthropic Claude', apiKeyStorageKey: 'claudeApiKey' });
  }
  async callAPI(systemPrompt, userPrompt, jsonSchema, options) {
    // Claude API implementation
  }
}

// 2. Register in providerRegistry.js
registerProvider(new ClaudeProvider());

// Done! UI and backend automatically support the new provider
```

### Data Processing Pipeline

1. **Interception**: Background worker detects API calls via chrome.webRequest
2. **Processing**: Data flows through processor modules in `src/utils/`
3. **Storage**: Session data cached in background worker memory
4. **Rendering**: Components consume processed data from React state/props
5. **AI Analysis**: Optional parallel processing of patient data through AI APIs

### CSS & Theming

- Material-UI (MUI) v6.5 for component library
- Custom theme in `src/theme.js`
- Global styles in `src/index.css`
- Text size utilities in `textSizeUtils.js` provide dynamic sizing based on user settings

## Important Patterns

### Settings Pattern
Always load settings via `settingsManager.js` functions rather than direct Chrome storage access. Default values are defined in `config/defaultSettings.js`.

### Data Processor Pattern
Medical data processing follows consistent pattern:
```javascript
export const {dataType}Processor = (rawData, settings) => {
  // Transform raw API data
  // Apply user settings (formatting, filtering)
  // Return structured data for UI consumption
}
```

### Copy Formatting
Custom copy formats are handled by dedicated formatter utilities:
- `medicationCopyFormatter.js` for medications
- `labCopyFormatter.js` for lab results
- `gaiCopyFormatter.js` for AI analysis XML

### Chrome Extension Permissions
The extension requires:
- `webRequest` for API interception
- `storage` for user settings persistence
- `scripting` for content script injection
- `clipboardWrite` for copy-to-clipboard features
- Host permissions for medcloud2.nhi.gov.tw, drugtw.com, api.openai.com

## Development Notes

- **Locale**: All UI text is in Traditional Chinese (zh-TW), medical terminology follows Taiwanese physician conventions
- **Target Browsers**: Chrome and Chromium-based browsers (Edge)
- **React Version**: 19.0 with automatic JSX transform
- **Code Style**: ESLint configured with custom stylistic rules (see `eslint.config.js`)
  - Semicolons required
  - Flexible on quotes, indentation, brace styles
  - Max 2 consecutive empty lines

## Key Files Reference

### Core Extension Files
- `manifest.json` - Extension manifest (copied from public/ during build)
- `src/background.js` - Service worker with API interception logic
- `src/contentScript.jsx` - Content script entry point
- `src/components/FloatingIcon.jsx` - Main UI entry (38KB, complex state management)
- `src/components/Sidebar.jsx` - AI analysis sidebar with resizing
- `src/utils/dataManager.js` - Central data processing orchestrator
- `src/utils/settingsManager.js` - Settings CRUD operations
- `scripts/build.js` - Custom build script for bundling and packaging

### GAI Service Module (`src/services/gai/`)
- `index.js` - Unified export interface for GAI services
- `AnalysisEngine.js` - Analysis execution engine with state tracking
- `providers/BaseProvider.js` - Abstract provider base class
- `providers/OpenAIProvider.js` - OpenAI API implementation
- `providers/GeminiProvider.js` - Gemini API implementation
- `providers/providerRegistry.js` - Provider registration system
- `prompts/PromptManager.js` - Template management system
- `prompts/templates/defaultAnalysis.js` - Default 4-category analysis template

### Legacy/Deprecated (for backward compatibility)
- `src/config/gaiConfig.js` - Legacy config (migrated to `prompts/templates/`)
