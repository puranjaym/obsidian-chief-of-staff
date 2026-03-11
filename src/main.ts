import { Notice, Plugin, addIcon } from 'obsidian';
import { AIChiefOfStaffSettingTab } from './settings';
import { OllamaService } from './services/ollama';
import { GoogleAuthService } from './services/google-auth';
import { CalendarService } from './services/calendar';
import { GmailService } from './services/gmail';
import { SmartConnectionsService } from './services/smart-connections';
import { MeetingPrepFeature } from './features/meeting-prep';
import { InboxTriageFeature } from './features/inbox-triage';
import { TimeAuditFeature } from './features/time-audit';
import { DEFAULT_SETTINGS, type AIChiefOfStaffSettings } from './types';

export default class AIChiefOfStaffPlugin extends Plugin {
  settings: AIChiefOfStaffSettings = DEFAULT_SETTINGS;

  ollamaService!: OllamaService;
  googleAuthService!: GoogleAuthService;
  calendarService!: CalendarService;
  gmailService!: GmailService;
  smartConnectionsService!: SmartConnectionsService;

  meetingPrepFeature!: MeetingPrepFeature;
  inboxTriageFeature!: InboxTriageFeature;
  timeAuditFeature!: TimeAuditFeature;

  private statusBarItem: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerCustomIcons();
    this.initializeServices();
    this.initializeFeatures();
    this.registerCommands();
    this.registerRibbonIcons();
    this.initializeStatusBar();
    this.addSettingTab(new AIChiefOfStaffSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.startBackgroundTasks();
      this.updateStatusBar();
    });

    console.log('AI Chief of Staff plugin loaded');
  }

  private registerCustomIcons(): void {
    addIcon('meeting-debrief', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path></svg>');

    addIcon('inbox-triage', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>');

    addIcon('time-audit', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>');

    addIcon('daily-briefing', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>');
  }

  private registerRibbonIcons(): void {
    this.addRibbonIcon('meeting-debrief', 'Generate Meeting Debrief', async () => {
      if (!this.googleAuthService.isAuthenticated()) {
        new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
        return;
      }
      new Notice('Generating meeting debrief...');
      try {
        await this.meetingPrepFeature.generateBriefManually();
        new Notice('Meeting debrief generated!');
      } catch (error) {
        new Notice(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    this.addRibbonIcon('inbox-triage', 'Triage Email Inbox', async () => {
      if (!this.googleAuthService.isAuthenticated()) {
        new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
        return;
      }
      new Notice('Triaging inbox...');
      try {
        const emails = await this.inboxTriageFeature.triageInbox();
        new Notice(`Triaged ${emails.length} emails`);
      } catch (error) {
        new Notice(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    this.addRibbonIcon('time-audit', 'Generate Time Audit', async () => {
      if (!this.googleAuthService.isAuthenticated()) {
        new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
        return;
      }
      new Notice('Generating time audit...');
      try {
        await this.timeAuditFeature.generateTimeAudit();
        new Notice('Time audit generated!');
      } catch (error) {
        new Notice(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private initializeStatusBar(): void {
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass('ai-cos-status');
    this.statusBarItem.setText('AI CoS: Loading...');

    this.registerInterval(
      window.setInterval(() => this.refreshStatusBar(), 60000)
    );

    setTimeout(() => this.refreshStatusBar(), 2000);
  }

  private async refreshStatusBar(): Promise<void> {
    if (!this.statusBarItem) return;

    try {
      const ollamaOk = await this.ollamaService.testConnection();
      const googleOk = this.googleAuthService.isAuthenticated();

      const ollamaStatus = ollamaOk ? '🟢' : '🔴';
      const googleStatus = googleOk ? '🟢' : '🔴';

      this.statusBarItem.setText(`AI CoS: Ollama ${ollamaStatus} | Google ${googleStatus}`);
      this.statusBarItem.setAttr('title', `Ollama: ${ollamaOk ? 'Connected' : 'Offline'}\nGoogle: ${googleOk ? 'Authenticated' : 'Not connected'}`);
    } catch {
      this.statusBarItem.setText('AI CoS: ⚠️');
    }
  }

  async updateStatusBar(): Promise<void> {
    await this.refreshStatusBar();
  }

  onunload(): void {
    this.meetingPrepFeature?.stopAutoCheck();
    this.inboxTriageFeature?.stopAutoTriage();
    console.log('AI Chief of Staff plugin unloaded');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private initializeServices(): void {
    this.ollamaService = new OllamaService(
      this.settings.ollamaUrl,
      this.settings.ollamaModel
    );

    this.googleAuthService = new GoogleAuthService(this);
    this.calendarService = new CalendarService(this.googleAuthService);
    this.gmailService = new GmailService(this.googleAuthService);
    this.smartConnectionsService = new SmartConnectionsService(this.app);
  }

  private initializeFeatures(): void {
    this.meetingPrepFeature = new MeetingPrepFeature(
      this.app,
      this.ollamaService,
      this.calendarService,
      this.smartConnectionsService,
      this.settings.dailyNotePath
    );

    this.inboxTriageFeature = new InboxTriageFeature(
      this.app,
      this.ollamaService,
      this.gmailService,
      this.smartConnectionsService,
      this.settings.inboxNotePath
    );

    this.timeAuditFeature = new TimeAuditFeature(
      this.app,
      this.ollamaService,
      this.calendarService,
      this.settings.weeklyReviewPath
    );
  }

  updateServices(): void {
    this.ollamaService.updateConfig(
      this.settings.ollamaUrl,
      this.settings.ollamaModel
    );
  }

  updateFeatures(): void {
    this.meetingPrepFeature.updateConfig(this.settings.dailyNotePath);
    this.inboxTriageFeature.updateConfig(this.settings.inboxNotePath);
    this.timeAuditFeature.updateConfig(this.settings.weeklyReviewPath);
  }

  private startBackgroundTasks(): void {
    if (this.googleAuthService.isAuthenticated()) {
      this.meetingPrepFeature.startAutoCheck(this.settings.meetingPrepMinutesBefore);
    }
  }

  private registerCommands(): void {
    this.addCommand({
      id: 'summarize-current-note',
      name: 'Summarize Current Note',
      editorCallback: async (editor) => {
        const content = editor.getValue();
        if (!content.trim()) {
          new Notice('Note is empty');
          return;
        }

        new Notice('Summarizing note...');
        try {
          const summary = await this.ollamaService.summarizeNote(content);
          editor.replaceSelection(`\n\n---\n\n## AI Summary\n\n${summary}\n\n---\n\n`);
          new Notice('Summary generated!');
        } catch (error) {
          new Notice(`Failed to summarize: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'query-vault',
      name: 'Query Vault with AI',
      callback: async () => {
        const query = await this.promptForInput('Enter your query:');
        if (!query) return;

        new Notice('Searching vault...');
        try {
          const relatedNotes = await this.smartConnectionsService.getRelatedNotes(query, 5);
          const response = await this.ollamaService.queryVaultWithContext(query, relatedNotes);

          await this.createOrAppendNote('AI Query Results.md',
            `## Query: ${query}\n\n${response}\n\n*Generated: ${new Date().toLocaleString()}*\n\n---\n\n`
          );

          new Notice('Query results saved to AI Query Results.md');
        } catch (error) {
          new Notice(`Query failed: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'prepare-next-meeting',
      name: 'Generate Meeting Note Debrief',
      callback: async () => {
        if (!this.googleAuthService.isAuthenticated()) {
          new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
          return;
        }

        new Notice('Generating meeting debrief...');
        try {
          await this.meetingPrepFeature.generateBriefManually();
          new Notice('Meeting debrief generated!');
        } catch (error) {
          new Notice(`Failed to generate debrief: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'triage-inbox',
      name: 'Triage Email Inbox',
      callback: async () => {
        if (!this.googleAuthService.isAuthenticated()) {
          new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
          return;
        }

        new Notice('Triaging inbox...');
        try {
          const emails = await this.inboxTriageFeature.triageInbox();
          new Notice(`Triaged ${emails.length} emails. Check ${this.settings.inboxNotePath}`);
        } catch (error) {
          new Notice(`Failed to triage inbox: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'weekly-time-audit',
      name: 'Generate Weekly Time Audit',
      callback: async () => {
        if (!this.googleAuthService.isAuthenticated()) {
          new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
          return;
        }

        new Notice('Generating time audit...');
        try {
          await this.timeAuditFeature.generateTimeAudit();
          new Notice(`Time audit generated! Check ${this.settings.weeklyReviewPath}`);
        } catch (error) {
          new Notice(`Failed to generate audit: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'test-ollama',
      name: 'Test Ollama Connection',
      callback: async () => {
        new Notice('Testing Ollama connection...');
        const success = await this.ollamaService.testConnection();
        if (success) {
          new Notice('✅ Ollama is connected and ready!');
        } else {
          new Notice('❌ Cannot connect to Ollama. Check settings.');
        }
      }
    });

    this.addCommand({
      id: 'fetch-today-events',
      name: 'Fetch Today\'s Calendar Events',
      callback: async () => {
        if (!this.googleAuthService.isAuthenticated()) {
          new Notice('Please connect to Google first');
          return;
        }

        try {
          const events = await this.calendarService.fetchTodayEvents();
          const summary = events.map(e =>
            `- ${e.summary} (${e.start.toLocaleTimeString()})`
          ).join('\n');

          await this.createOrAppendNote('Today Events.md',
            `# Today's Events\n\n${summary || 'No events today'}\n\n*Fetched: ${new Date().toLocaleString()}*`
          );
          new Notice(`Found ${events.length} events`);
        } catch (error) {
          new Notice(`Failed to fetch events: ${error}`);
        }
      }
    });

    this.addCommand({
      id: 'daily-briefing',
      name: 'Start My Day - Daily Briefing',
      callback: async () => {
        if (!this.googleAuthService.isAuthenticated()) {
          new Notice('Please connect to Google first (Settings > AI Chief of Staff)');
          return;
        }

        new Notice('Generating daily briefing...');
        try {
          await this.generateDailyBriefing();
          new Notice('Daily briefing generated!');
        } catch (error) {
          new Notice(`Failed to generate briefing: ${error}`);
        }
      }
    });
    this.addCommand({
      id: 'install-background-service',
      name: 'Install Background Service Daemon',
      callback: () => {
        new Notice('Installing background service...');
        try {
          const { exec } = (window as any).require('child_process');
          const path = (window as any).require('path');
          const vaultPath = (this.app.vault.adapter as any).getBasePath();
          const pluginDir = path.join(vaultPath, '.obsidian/plugins/ai-chief-of-staff/backend');

          exec(`node "${path.join(pluginDir, 'setup-service.mjs')}" "${vaultPath}"`, (error: any, stdout: string, stderr: string) => {
            if (error) {
              new Notice('Failed to install service: ' + error.message);
              console.error(stderr);
            } else {
              new Notice('✅ Background service installed successfully!');
            }
          });
        } catch (e) {
          new Notice('Setup error: ' + String(e));
        }
      }
    });

  }

  private async generateDailyBriefing(): Promise<void> {
    if (!this.settings.dailyNotePath) {
      throw new Error('Please configure the Meeting Note Debriefs folder path in settings');
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const events = await this.calendarService.fetchTodayEvents();

    let emails: import('./types').Email[] = [];
    let urgentEmails: import('./types').Email[] = [];

    try {
      emails = await this.gmailService.fetchUnreadEmails(10);
      urgentEmails = emails.filter(e => {
        const subject = (e.subject || '').toLowerCase();
        return subject.includes('urgent') || subject.includes('asap') || subject.includes('important');
      });
    } catch {
      console.log('Failed to fetch emails for daily briefing');
    }

    const upcomingEvents = events.filter(e => e.start && e.start > today).slice(0, 5);

    const formatEventTime = (date: Date | undefined): string => {
      if (!date) return '--:--';
      try {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '--:--';
      }
    };

    const eventsList = upcomingEvents.length > 0
      ? upcomingEvents.map(e => `| ${formatEventTime(e.start)} | ${e.summary || 'Untitled'} | ${e.attendees?.length || 0} |`).join('\n')
      : '| - | No events scheduled | - |';

    const emailSummary = emails.length > 0
      ? `You have **${emails.length}** unread emails${urgentEmails.length > 0 ? `, including **${urgentEmails.length}** potentially urgent` : ''}.`
      : 'Your inbox is clear!';

    const urgentSection = urgentEmails.length > 0
      ? `\n> [!warning] Urgent Emails\n${urgentEmails.map(e => `> - **${e.subject || 'No subject'}** from ${(e.from || 'Unknown').split('<')[0].trim()}`).join('\n')}\n`
      : '';

    const firstMeetingInfo = upcomingEvents.length > 0
      ? `${upcomingEvents[0].summary || 'Untitled'} at ${formatEventTime(upcomingEvents[0].start)}`
      : 'None';

    const content = `# ☀️ Daily Briefing - ${dateStr}

*Generated at ${today.toLocaleTimeString()}*

## 📊 Overview

> [!info] Today at a Glance
> - **${events.length}** calendar events
> - **${emails.length}** unread emails
> - First meeting: ${firstMeetingInfo}

## 📅 Today's Schedule

| Time | Event | Attendees |
|------|-------|-----------|
${eventsList}

## 📧 Email Status

${emailSummary}
${urgentSection}
## ✅ Quick Actions

- [ ] Review urgent emails
- [ ] Prepare for first meeting
- [ ] Check weekly priorities

---

*Use the ribbon icons or command palette for Meeting Debriefs, Inbox Triage, or Time Audit*
`;

    let folderPath = this.settings.dailyNotePath;
    if (folderPath.endsWith('.md')) {
      const lastSlash = folderPath.lastIndexOf('/');
      folderPath = lastSlash > 0 ? folderPath.substring(0, lastSlash) : '';
    }

    if (folderPath) {
      const folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        await this.app.vault.createFolder(folderPath);
      }
    }

    const briefingPath = folderPath ? `${folderPath}/${dateStr}-briefing.md` : `${dateStr}-briefing.md`;
    const existingFile = this.app.vault.getAbstractFileByPath(briefingPath);

    if (existingFile) {
      await this.app.vault.modify(existingFile as import('obsidian').TFile, content);
    } else {
      await this.app.vault.create(briefingPath, content);
    }

    const leaf = this.app.workspace.getLeaf(false);
    const file = this.app.vault.getAbstractFileByPath(briefingPath);
    if (file) {
      await leaf.openFile(file as import('obsidian').TFile);
    }
  }

  private async promptForInput(message: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: var(--background-primary); padding: 20px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999; min-width: 400px;
      `;

      modal.innerHTML = `
        <div style="margin-bottom: 15px; font-weight: bold;">${message}</div>
        <input type="text" style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);">
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
          <button class="cancel-btn">Cancel</button>
          <button class="submit-btn mod-cta">Submit</button>
        </div>
      `;

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998;';

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      const input = modal.querySelector('input') as HTMLInputElement;
      input.focus();

      const cleanup = () => {
        modal.remove();
        overlay.remove();
      };

      modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      modal.querySelector('.submit-btn')?.addEventListener('click', () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          cleanup();
          resolve(value || null);
        } else if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      });

      overlay.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
    });
  }

  private async createOrAppendNote(path: string, content: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!file) {
      await this.app.vault.create(path, content);
    } else {
      const existingContent = await this.app.vault.read(file as import('obsidian').TFile);
      await this.app.vault.modify(file as import('obsidian').TFile, content + '\n\n' + existingContent);
    }
  }
}
