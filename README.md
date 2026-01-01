# 🤖 Obsidian AI Chief of Staff

**An AI-powered productivity orchestrator for Obsidian that connects your internal knowledge (vault) with external obligations (Google Calendar/Gmail) to automate meeting preparation, inbox triage, and time analysis.**


## ✨ Features

### 📝 Meeting Note Debriefs

- Automatically generates detailed debriefs before meetings

- Pulls relevant context from your vault using **Smart Connections**

- Creates talking points based on past interactions and vault content

- Writes debriefs to your configured **Meeting Note Debriefs** folder


### 📥 Inbox Triage

- Fetches unread emails from **Gmail**

- Uses local AI to classify emails as **URGENT**, **REVIEW**, or **NOISE**

- Creates a markdown dashboard with organized emails

- Supports draft reply generation using vault context


### ⏱️ Weekly Time Audit

- Analyzes your last 7 days of calendar events

- Categorizes time into **Deep Work**, **Meetings**, **Admin**, etc.

- Generates **Mermaid pie charts** showing time allocation

- Provides insights on your time usage patterns


## 📋 Prerequisites

### 1. 🦙 Ollama (Local LLM)

Install Ollama and pull a model:

```
# Install Ollama (macOS/Linux)
curl -fsSL [https://ollama.com/install.sh](https://ollama.com/install.sh) | sh

# Pull recommended model
ollama pull gemma2:9b

# Verify it's running
curl http://localhost:11434/api/tags
```

### 2. ☁️ Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/ "null")

2. Create a new project named `obsidian-chief-of-staff`

3. Enable the following APIs:

    - **Gmail API**

    - **Google Calendar API**

4. Configure **OAuth Consent Screen**:

    - User Type: **External**

    - Status: **Testing**

    - Add your Gmail as a **Test User**

5. Create **OAuth 2.0 Credentials**:

    - Type: **Desktop Application**

    - Note down the **Client ID** and **Client Secret**


### 3. 🧠 Smart Connections Plugin

1. Install **Smart Connections** from Obsidian Community Plugins

2. Enable it and let it fully index your vault

3. This provides semantic search capabilities for meeting prep


## 💾 Installation

### Option 1: 📦 Manual Installation

1. Build the plugin:

    ```
    npm install
    npm run build
    ```

2. Create the plugin folder in your vault:

    ```
    <your-vault>/.obsidian/plugins/ai-chief-of-staff/
    ```

3. Copy these files to the plugin folder:

    - `main.js`

    - `manifest.json`

    - `styles.css`

4. Restart Obsidian or reload plugins

5. Enable **"AI Chief of Staff"** in **Settings > Community Plugins**


### Option 2: 🛠️ Development Mode

1. Clone/copy this project to your vault's plugins folder

2. Run `npm run dev` for watch mode

3. Use the **Hot Reload** plugin for instant updates


## ⚙️ Configuration

Open **Settings > AI Chief of Staff** to configure:

### 🦙 Ollama Settings

- **Ollama URL**: Default is `http://localhost:11434`

- **Model Selection**: Choose from recommended models:

    - **Gemma 3n 4B** (`gemma3:4b-it-qat`) - Fast and efficient, great for most tasks

    - **Gemma 2 9B** (`gemma2:9b`) - More capable, requires more RAM

    - **Llama 3 8B** (`llama3:8b`) - General purpose

    - **Custom Model** - Enter any Ollama model name

- Use **"Test Connection"** to verify


### 🔗 Google Integration

1. Enter your **Client ID** from Google Cloud Console

2. Enter your **Client Secret**

3. Click **"Open Google Auth"** and authorize

4. Paste the authorization code and click **Submit**


### 📂 Note Paths

- **Meeting Note Debriefs Folder**: Where meeting debriefs are saved (e.g., Daily Notes)

- **Inbox Triage Note**: Path for email dashboard (e.g., Inbox Triage.md)

- **Weekly Review Note**: Path for time audit reports (e.g., Weekly Review.md)


> [!NOTE]
> 
> All paths must be configured for features to work. Warning messages will appear if any path is missing.

### 📅 Scheduling

- **Meeting Debrief Lead Time**: Minutes before meeting to generate debrief

- **Sync Interval**: How often to sync with Google (in minutes)


## ⌨️ Commands

|   |   |
|---|---|
|**Command**|**Description**|
|`Summarize Current Note`|Generate AI summary of the active note|
|`Query Vault with AI`|Semantic search with AI-powered answers|
|`Generate Meeting Note Debrief`|Generate debrief for upcoming event|
|`Triage Email Inbox`|Classify and organize unread emails|
|`Generate Weekly Time Audit`|Create time allocation report|
|`Start My Day - Daily Briefing`|Morning overview with calendar and email summary|
|`Test Ollama Connection`|Verify local AI is running|
|`Fetch Today's Calendar Events`|Quick view of today's schedule|

Access commands via:

- **Command Palette** (Cmd/Ctrl + P)

- **Keyboard shortcuts** (configurable in Settings > Hotkeys)

- **Ribbon Icons** (sidebar) for quick access to key features


## 🖥️ UI Features

### 🎗️ Ribbon Icons

Three clickable icons appear in the left sidebar for one-click access:

- 📅 **Meeting Debrief** - Generate debrief for next meeting

- 📧 **Inbox Triage** - Classify unread emails

- 📊 **Time Audit** - Create weekly time report


### 🟢 Status Bar

The bottom status bar shows connection status:

- `AI CoS: Ollama 🟢 | Google 🟢` - Both services connected

- Red indicators show which service needs attention


### 🎨 Enhanced Output

Generated notes use Obsidian's callout blocks for better readability:

- `[!danger]` - Urgent items requiring immediate attention

- `[!warning]` - Items needing review

- `[!info]` - Low priority or informational

- `[!tip]` - Suggested next steps


## 🔒 Privacy

This plugin is designed with privacy in mind:

- All AI processing happens **locally via Ollama**

- Your notes never leave your machine

- Only Google API calls are made externally for calendar/email

- OAuth tokens are stored locally in your vault's plugin data


## ❓ Troubleshooting

### ❌ Ollama Connection Failed

- Ensure Ollama is running: `ollama serve`

- Check the URL in settings (default: `http://localhost:11434`)

- Verify you have a model installed: `ollama list`


### 🔑 Google Auth Issues

- Verify your OAuth consent screen is in **Testing** mode

- Make sure your email is added as a **Test User**

- Check that **Client ID** and **Secret** are correct

- Try generating new credentials if issues persist


### 🔍 Smart Connections Not Found

- Install and enable the **Smart Connections** plugin

- Wait for initial indexing to complete

- The plugin will fall back to basic search if unavailable


## 💻 Development

```
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build
```

## 📜 License

MIT
