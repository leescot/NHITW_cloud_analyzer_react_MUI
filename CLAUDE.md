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
- `Sidebar.jsx` - Resizable sidebar with AI analysis (GAI Sidebar V2)
  - Fixed 3-tab design: 自動 (Auto), 快速 (Quick), 對話 (Chat)
  - Supports 7 preset templates + custom configurations
  - Selective data transmission (choose from 10 medical data types)
  - Auto-analysis on data load with granular loading states
  - Built-in tab configuration dialog (accessible via settings icon)
- `PopupSettings.jsx` - Settings modal, passes developerMode prop to child components

**Sidebar Components** (`src/components/sidebar/`):
- `Tab1AutoAnalysis.jsx` - Auto-analysis tab with copy functionality
- `Tab2QuickButtons.jsx` - 6-button grid with shared result area, copy functionality
- `Tab3Chat.jsx` - Multi-turn chat with per-message copy buttons (AI messages only)
- `SidebarV2ConfigDialog.jsx` - Configuration dialog for all 3 tabs
- `CustomButtonEditor.jsx` - Editor for custom quick buttons
- `MarkdownRenderer.jsx` - Full Markdown support (tables, lists, bold, links)

**Tab Components** (`src/components/tabs/`):
- Each medical data category (medications, labs, imaging, etc.) has dedicated tab components
- `Overview.jsx` and `Overview_*.jsx` files provide dashboard views with tracked metrics
- Naming pattern: `{DataType}Data.jsx` for data display, `Overview_{Feature}.jsx` for dashboard widgets

**Settings Components** (`src/components/settings/`):
- Modular settings panels for different categories (General, Medication, Lab, Chinese Medicine, GAI, etc.)
- Each settings component manages its own storage sync operations

### AI Integration (GAI Feature)

The extension uses a **modular architecture** for both AI provider integration and analysis template management, making it easy to add new AI services and customize analysis workflows.

#### Modular Architecture (`src/services/gai/`)

**Provider System** (`providers/`):
- `BaseProvider.js` - Abstract base class defining unified API interface
- `CerebrasProvider.js` - Cerebras implementation (recommended, llama-3.3-70b-versatile)
- `GroqProvider.js` - Groq implementation (llama-3.3-70b-versatile)
- `GeminiProvider.js` - Google Gemini implementation (gemini-3-flash-preview)
- `OpenAIProvider.js` - OpenAI implementation (gpt-5-nano, strict JSON schema)
- `providerRegistry.js` - Provider registration and management system (order: Cerebras > Groq > Gemini > OpenAI)
- All providers implement the same `callAPI()` interface for consistency

**Prompt Management** (`prompts/`):
- `PromptManager.js` - Template management system
- `templates/defaultAnalysis.js` - Default analysis template with 4 categories
- Templates are versioned and can be extended independently

**Analysis Engine**:
- `AnalysisEngine.js` - Unified analysis execution with state tracking
- Supports single and batch (parallel) analysis
- Built-in performance monitoring and error handling

**Sidebar Tab System** (`tabs/`) - NEW:
- `TabTemplateManager.js` - Manages all sidebar analysis templates (preset + custom)
- `presetTemplates.js` - 7 preset templates across 3 categories:
  - **Basic** (4): Critical Alerts, Medication Risks, Abnormal Labs, Imaging Findings
  - **Specialized** (2): Renal Medication, Diabetes Management
  - **Advanced** (1): Comprehensive Summary
- `index.js` - Unified export interface for tab services
- Templates define: system prompts, JSON schemas, required data types, UI metadata

**Key Benefits**:
- **Easy extensibility**: Add new AI providers by extending `BaseProvider` (~80 lines)
- **Provider-agnostic**: Frontend code works with any registered provider
- **Backward compatible**: Existing code continues to work without changes
- **Dynamic UI**: Settings automatically show all registered providers
- **User customization**: 4 configurable sidebar tabs (3 from presets + 1 custom)
- **Selective data**: Choose which medical data types to send per analysis
- **Template-driven**: Each tab uses structured templates with validation

**Implementation Details**:
- System prompts and schemas in `prompts/templates/` and `tabs/presetTemplates.js`
- Background worker routes requests through provider registry
- Automatic response format normalization (all providers return OpenAI-compatible format)
- Metrics tracking (tokens, execution time) for cost/performance monitoring
- Selective XML generation via `dataSelector.js` (10 data types: diagnosis, patient summary, allergy, surgery, discharge, HBCV, medication, lab, Chinese med, imaging)

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

**Adding a New Template** (example):
```javascript
// Add to presetTemplates.js
export const PRESET_TEMPLATES = {
  my_template: {
    id: 'my_template',
    name: '我的分析',
    icon: 'AutoAwesome',
    category: 'specialized',
    description: '自訂分析描述',
    dataTypes: ['medication', 'lab'],  // Choose from 9 types
    systemPrompt: '你的 AI 指令...',
    schema: { /* JSON schema definition */ }
  }
};
// Done! Template automatically appears in tab configuration UI
```

### GAI Sidebar V2 Architecture (Current)

**Overview**: The GAI Sidebar uses a fixed 3-tab design with distinct functionalities for each tab.

**Key Features**:
1. **3 Fixed Tabs** (V2 Architecture):
   - **Tab 1 - 自動 (Auto)**: Single auto-analysis on sidebar open (7 preset templates available)
   - **Tab 2 - 快速 (Quick)**: 6 configurable quick buttons (preset or custom analysis)
   - **Tab 3 - 對話 (Chat)**: Multi-turn conversation with medical data
2. **7 Preset Templates** across 3 categories:
   - Basic (4): Drug Interaction, Abnormal Labs, Imaging Findings, ATC Classification
   - Specialized (2): Renal Medication Analysis, Diabetes Management
   - Advanced (1): Comprehensive Pre-Visit Summary
3. **10 Medical Data Types**: Selective transmission of diagnosis, patient summary, allergy, surgery, discharge, HBCV, medication, lab, Chinese medicine, imaging
4. **Copy Functionality**: All tabs support copying AI results (Tab 1/2: header button, Tab 3: per-message button)
5. **Developer Mode**: Advanced settings (XML format, prompt inclusion) only visible in developer mode

**Data Flow**:
```
User Opens Sidebar
  ↓
Load Tab Config (chrome.storage.sync → gaiSidebarTabs, gaiCustomTabConfig)
  ↓
Render 4 Tabs dynamically (TabTemplateManager provides metadata)
  ↓
User Clicks Analyze (or Auto-Analyze on data load)
  ↓
For Each Tab:
  - Get Template (preset or custom)
  - Select Data Types (dataSelector.js → generateSelectiveXML)
  - Build Prompt (template.systemPrompt + template.schema)
  - Call AI Provider (background.js routes to OpenAI/Gemini/etc)
  - Display Results (granular loading states per tab)
```

**Configuration Storage**:
- `gaiSidebarTabs`: Array of 4 tab configs (e.g., `[{slotIndex: 0, templateId: 'critical_alerts', type: 'preset'}, ...]`)
- `gaiCustomTabConfig`: Detailed config for custom tab (name, icon, dataTypes, systemPrompt, quickQuestions, schema)

**Template Structure**:
Each template includes:
- `id`, `name`, `icon`, `category`, `description` (UI metadata)
- `dataTypes` (array of required data types from 9 available)
- `systemPrompt` (AI instruction in Traditional Chinese)
- `schema` (JSON Schema for structured output validation)

**Extensibility**:
- Add new preset: Edit `tabs/presetTemplates.js` (automatically appears in tab config UI)
- Add new data type: Update `dataTypeMetadata.js` + add formatter to `gaiCopyFormatter.js`
- Validation: `TabTemplateManager.validateTemplate()` ensures template integrity

### Data Processing Pipeline

1. **Interception**: Background worker detects API calls via chrome.webRequest
2. **Processing**: Data flows through processor modules in `src/utils/`
3. **Storage**: Session data cached in background worker memory
4. **Rendering**: Components consume processed data from React state/props
5. **AI Analysis**: Optional parallel processing of patient data through AI APIs
   - Selective data transmission based on template requirements
   - Granular loading states per analysis tab
   - Dynamic template-driven prompt generation

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
- `gaiCopyFormatter.js` for AI analysis XML (exports individual format functions)
- `dataSelector.js` for selective XML generation based on data type selection

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

### Important Technical Notes

**React 19 Import Pattern**:
- Use `import { useState } from 'react'` NOT `import React from 'react'`
- React 19's automatic JSX transform doesn't require React import
- Importing React can cause "React is not defined" errors in content scripts

**Z-Index Management**:
- Sidebar uses maximum z-index (2147483648) to ensure visibility above all page elements
- Floating button uses 2147483647
- These values override any conflicting page styles on medcloud2.nhi.gov.tw

**Storage Sync Pattern**:
- Always provide default values when reading from chrome.storage.sync
- Use async/await pattern with proper error handling
- New settings automatically initialize with defaults on first load (see `settingsManager.js`)

## Key Files Reference

### Core Extension Files
- `manifest.json` - Extension manifest (copied from public/ during build)
- `src/background.js` - Service worker with API interception logic
- `src/contentScript.jsx` - Content script entry point
- `src/components/FloatingIcon.jsx` - Main UI entry (38KB, complex state management)
- `src/components/Sidebar.jsx` - AI analysis sidebar with resizing and dynamic tab rendering
- `src/utils/dataManager.js` - Central data processing orchestrator
- `src/utils/settingsManager.js` - Settings CRUD operations (includes sidebar tab config management)
- `scripts/build.js` - Custom build script for bundling and packaging

### GAI Service Module (`src/services/gai/`)

**Core Services:**
- `index.js` - Unified export interface for GAI services
- `AnalysisEngine.js` - Analysis execution engine with state tracking

**Provider System:**
- `providers/BaseProvider.js` - Abstract provider base class
- `providers/CerebrasProvider.js` - Cerebras API implementation (recommended)
- `providers/GroqProvider.js` - Groq API implementation
- `providers/GeminiProvider.js` - Gemini API implementation
- `providers/OpenAIProvider.js` - OpenAI API implementation
- `providers/providerRegistry.js` - Provider registration system (Cerebras > Groq > Gemini > OpenAI)

**Prompt System:**
- `prompts/PromptManager.js` - Template management system
- `prompts/templates/defaultAnalysis.js` - Default 4-category analysis template

**Tab Template System (NEW):**
- `tabs/TabTemplateManager.js` - Sidebar template manager with validation
- `tabs/presetTemplates.js` - 7 preset analysis templates (basic/specialized/advanced)
- `tabs/index.js` - Unified export for tab services

### Configuration Files

**GAI Configuration:**
- `src/config/dataTypeMetadata.js` - 9 medical data type definitions with UI metadata
- `src/config/sidebarTabDefaults.js` - Default sidebar tab configuration (4 slots)

**Utility Modules:**
- `src/utils/dataSelector.js` - Selective XML generator for flexible data transmission
- `src/utils/gaiCopyFormatter.js` - Medical data XML formatters (9 export functions)

### UI Components

**Sidebar Components:**
- `src/components/sidebar/Tab1AutoAnalysis.jsx` - Auto-analysis display with copy
- `src/components/sidebar/Tab2QuickButtons.jsx` - Quick buttons grid with results
- `src/components/sidebar/Tab3Chat.jsx` - Chat interface with per-message copy
- `src/components/sidebar/SidebarV2ConfigDialog.jsx` - V2 configuration dialog
- `src/components/sidebar/CustomButtonEditor.jsx` - Custom button editor
- `src/components/sidebar/MarkdownRenderer.jsx` - Markdown rendering component

### Documentation
- `docs/GAI_MODULARIZATION_PLAN.md` - GAI modularization architecture and implementation plan

### Legacy/Deprecated (for backward compatibility)
- `src/config/gaiConfig.js` - Legacy config (migrated to `prompts/templates/`)
