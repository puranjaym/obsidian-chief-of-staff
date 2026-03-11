# 🤖 Obsidian AI Chief of Staff

**A zero-bloat, highly self-sufficient AI productivity orchestrator for Obsidian. It deeply integrates with your local vault via QMD RAG, and automates your Google Calendar/Gmail via a native background daemon.**

This plugin uses a **Hybrid Architecture** to ensure Obsidian remains incredibly lightweight. The frontend UI lives in Obsidian, but the heavy lifting (LLM inference, API interactions, scheduling) is handled by a native background process powered by Node.js, Ollama, and the Google Workspace CLI.

---

## ✨ Features

- **⏱️ Automated Weekly Time Audit**: Categorizes your calendar into focused themes and updates your review notes automatically.
- **📥 Inbox Triage & digests**: Classifies unread mail into urgent vs noise, batching 90-day aging emails or newsletters into a single neat digest.
- **📝 Meeting Note Debriefs**: Checks context from your Google Calendar, searches your vault via QMD structured tags for people, and produces rich debrief notes with drafted follow-ups.
- **🤖 True Background Automation**: Orchestrated natively on Windows, macOS, or Linux, it runs consistently on a defined schedule even when Obsidian is closed.
- **🔒 Private by Design**: Everything runs entirely on your machine. Data only moves between Google and your local hardware.

---

## 🛠️ Super Simple, 3-Step Setup

Follow these steps to get your AI Chief of Staff up and running without touching code.

### 1. Install Ollama (Your Local AI Brain)
You need a local AI to perform tasks securely without sending private data to corporate servers.
- Download from: [https://ollama.com](https://ollama.com)
- Once installed, open your Terminal or Command Prompt and run:
  ```bash
  ollama pull gemma3:4b-it-qat
  ```
  *(This downloads the lightweight, highly capable Gemma 3 model. It may take a few minutes depending on your connection.)*

### 2. Install Google Workspace CLI (For Calendar/Email)
This tool allows your system to fetch emails and calendar events quickly without messy OAuth setup inside the plugin.
- Head to the [Google Workspace CLI Releases Page](https://github.com/googleworkspace/cli/releases)
- Download the binary for your operating system (Mac, Windows, or Linux)
- Extract it and run `gws login` in your terminal to authenticate your Google Account once.

### 3. Setup Obsidian Plugin & Enable the Background Daemon
- Install the **AI Chief of Staff** plugin into your Obsidian vault (either via Community Plugins or manually dropping the release into `.obsidian/plugins/ai-chief-of-staff`).
- Enable it in Obsidian Settings.
- Open the **AI Chief of Staff Settings** page in Obsidian:
  1. Define where your "Chief of Staff" instructions rulebook is located (e.g., `Chief of Staff/instructions.md`).
  2. Toggle the features you want active.
  3. Scroll to the bottom and click **"Install / Update Service"**.
  4. *Done!* This automatically generates a native background schedule (launchd for Mac, SchTasks for Windows, Cron for Linux) based on your interval preferences.

---

## ⚙️ How it Works under the Hood

### QMD RAG
Instead of using heavy vector databases that slow down Obsidian, this plugin leverages **QMD (Quiet Markdown)** metadata to perform fast, local RAG (Retrieval-Augmented Generation). It checks `instructions.md` and uses `find/grep` locally to scoop up the right contexts before asking Ollama to construct a draft.

### The Headless Daemon
Your machine runs a lightweight Node.js script in the background. At 9 AM, it might wake up, use `gws` to check to see what meetings you have, run cross-references in your vault, use Ollama to generate a "Debrief", edit your Obsidian file directly on disk, and pause until 1 PM.

### Auto-Drafts in Gmail
For Inbox Triage, if an email is marked as URGENT, the backend daemon will automatically use Ollama to draft a context-aware response based on your vault, and push it directly back to your Gmail web interface's "Drafts" folder using `gws`. You just have to review and click "Send"!

---

## 📜 License
MIT
