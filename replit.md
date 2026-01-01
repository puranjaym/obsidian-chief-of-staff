# Obsidian AI Chief of Staff Plugin

## Overview

This is an Obsidian plugin that acts as an AI-powered productivity orchestrator. It connects your internal knowledge (Obsidian Vault) with external obligations (Google Calendar/Gmail) to automate meeting preparation, inbox triage, and time analysis.

**Architecture:** Local-First (Privacy Centric)
**Core Dependencies:** Obsidian, Google Workspace APIs, Ollama (Local LLM), Smart Connections Plugin

## Project Structure

```
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── settings.ts             # Settings tab UI
│   ├── types.ts                # TypeScript type definitions
│   ├── services/
│   │   ├── ollama.ts           # Local LLM integration via Ollama
│   │   ├── google-auth.ts      # Google OAuth 2.0 authentication
│   │   ├── calendar.ts         # Google Calendar API service
│   │   ├── gmail.ts            # Gmail API service
│   │   └── smart-connections.ts # Smart Connections plugin integration
│   └── features/
│       ├── meeting-prep.ts     # Smart Meeting Prep feature
│       ├── inbox-triage.ts     # Email Inbox Triage feature
│       └── time-audit.ts       # Weekly Time Resource Audit
├── manifest.json               # Obsidian plugin manifest
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
├── esbuild.config.mjs          # Build configuration
├── styles.css                  # Plugin styles
└── main.js                     # Built output (generated)
```

## Core Features

### 1. Meeting Note Debriefs
- **Trigger:** Configurable minutes before any calendar event (or manual)
- **Action:** Fetches event details from Google Calendar, queries vault for related notes, generates AI debrief
- **Output:** Debrief note appended to Meeting Note Debriefs folder

### 2. Inbox Triage
- **Trigger:** Manual command or hourly background sync
- **Action:** Fetches unread emails, classifies as URGENT/REVIEW/NOISE
- **Output:** Markdown dashboard in designated Inbox Triage note

### 3. Time Resource Audit
- **Trigger:** Manual Weekly Review command
- **Action:** Fetches last 7 days of calendar events, categorizes by type
- **Output:** Mermaid.js pie chart and analysis in Weekly Review note

## Commands

- `Summarize Current Note` - Uses Ollama to summarize the active note
- `Query Vault with AI` - Search vault semantically and get AI-powered answer
- `Generate Meeting Note Debrief` - Generate debrief for upcoming event
- `Triage Email Inbox` - Classify and organize unread emails
- `Generate Weekly Time Audit` - Create time allocation report
- `Start My Day - Daily Briefing` - Morning overview with calendar and email summary
- `Test Ollama Connection` - Verify Ollama is running
- `Fetch Today's Calendar Events` - Quick calendar view

## UI Features

- **Ribbon Icons**: Quick access buttons in left sidebar for Meeting Debrief, Inbox Triage, and Time Audit
- **Status Bar**: Shows Ollama and Google connection status with color indicators
- **Callout Blocks**: Enhanced output using Obsidian's callout syntax for priority visualization

## Prerequisites

### 1. Ollama (Local LLM)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended model
ollama pull gemma2:9b

# Verify running
curl http://localhost:11434/api/tags
```

### 2. Google Cloud Platform
1. Create project: `obsidian-chief-of-staff`
2. Enable APIs: Gmail API, Google Calendar API
3. Configure OAuth consent screen (External, Testing mode)
4. Create OAuth 2.0 credentials (Desktop App type)
5. Note down Client ID and Client Secret

### 3. Smart Connections Plugin
- Install from Obsidian Community Plugins
- Let it fully index your vault

## Development

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build
```

## Installation in Obsidian

1. Build the plugin: `npm run build`
2. Copy to your vault's plugins folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Enable in Obsidian Settings > Community Plugins
4. Configure in Settings > AI Chief of Staff

## Recent Changes

- **v1.1.0:** Added ribbon icons, status bar, Daily Briefing command, enhanced callout styling, and Gemma 3n model support
- **v1.0.2:** Renamed "Smart Meeting Prep" to "Meeting Note Debriefs", added path validation warnings, and enhanced settings UI
- **v1.0.1:** Added comprehensive README.md and enhanced settings UI with dedicated API Keys Configuration section
- **v1.0.0 (Initial):** Complete MVP implementation with all three core capabilities

## User Preferences

- Privacy-first: All LLM processing happens locally via Ollama
- No data leaves the machine except for Google API calls
- Strict grounding prompts to prevent AI hallucinations
