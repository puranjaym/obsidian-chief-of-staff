import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type AIChiefOfStaffPlugin from './main';

export class AIChiefOfStaffSettingTab extends PluginSettingTab {
  plugin: AIChiefOfStaffPlugin;

  constructor(app: App, plugin: AIChiefOfStaffPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'AI Chief of Staff Settings' });

    this.displayApiKeysSection(containerEl);
    this.displayOllamaSettings(containerEl);
    this.displayGoogleAuthSection(containerEl);
    this.displayPathSettings(containerEl);
    this.displaySchedulingSettings(containerEl);
    this.displayFeatureToggles(containerEl);
    this.displayAdvancedLLMConfig(containerEl);
    this.displayEmailCalendarRules(containerEl);
    this.displayBackgroundServiceConfig(containerEl);
  }

  private displayApiKeysSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '🔑 API Keys Configuration' });

    const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    infoEl.style.marginBottom = '15px';
    infoEl.style.padding = '10px';
    infoEl.style.backgroundColor = 'var(--background-secondary)';
    infoEl.style.borderRadius = '5px';
    infoEl.innerHTML = `
      <strong>Setup Instructions:</strong><br>
      1. Create a Google Cloud project at <a href="https://console.cloud.google.com">console.cloud.google.com</a><br>
      2. Enable Gmail API and Google Calendar API<br>
      3. Create OAuth 2.0 credentials (Desktop App type)<br>
      4. Copy your Client ID and Client Secret below<br>
      <br>
      <em>Your keys are stored locally in your vault's plugin data folder.</em>
    `;

    new Setting(containerEl)
      .setName('Google OAuth Client ID')
      .setDesc('Your OAuth 2.0 Client ID from Google Cloud Console')
      .addText(text => {
        text
          .setPlaceholder('xxxxxxxxxx.apps.googleusercontent.com')
          .setValue(this.plugin.settings.googleClientId)
          .onChange(async (value) => {
            this.plugin.settings.googleClientId = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
        text.inputEl.style.minWidth = '300px';
      });

    new Setting(containerEl)
      .setName('Google OAuth Client Secret')
      .setDesc('Your OAuth 2.0 Client Secret from Google Cloud Console')
      .addText(text => {
        text
          .setPlaceholder('Enter your client secret')
          .setValue(this.plugin.settings.googleClientSecret)
          .onChange(async (value) => {
            this.plugin.settings.googleClientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.style.width = '100%';
        text.inputEl.style.minWidth = '300px';
      })
      .addButton(button => button
        .setButtonText('Show')
        .onClick(() => {
          const input = button.buttonEl.parentElement?.querySelector('input');
          if (input) {
            if (input.type === 'password') {
              input.type = 'text';
              button.setButtonText('Hide');
            } else {
              input.type = 'password';
              button.setButtonText('Show');
            }
          }
        }));

    const hasCredentials = this.plugin.settings.googleClientId && this.plugin.settings.googleClientSecret;
    const statusEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    statusEl.style.marginBottom = '20px';
    statusEl.style.padding = '8px 12px';
    statusEl.style.borderRadius = '4px';

    if (hasCredentials) {
      statusEl.style.backgroundColor = 'var(--background-modifier-success)';
      statusEl.style.color = 'var(--text-success)';
      statusEl.textContent = '✓ API keys configured. Proceed to Google Authentication below.';
    } else {
      statusEl.style.backgroundColor = 'var(--background-modifier-error)';
      statusEl.style.color = 'var(--text-error)';
      statusEl.textContent = '✗ Please enter your Google API keys above to enable Calendar and Gmail features.';
    }
  }

  private displayOllamaSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '🧠 Ollama Configuration' });

    new Setting(containerEl)
      .setName('Ollama URL')
      .setDesc('URL where Ollama is running (default: http://localhost:11434)')
      .addText(text => text
        .setPlaceholder('http://localhost:11434')
        .setValue(this.plugin.settings.ollamaUrl)
        .onChange(async (value) => {
          this.plugin.settings.ollamaUrl = value;
          await this.plugin.saveSettings();
          this.plugin.updateServices();
        }));

    const recommendedModels = [
      { value: 'gemma3:4b-it-qat', name: 'Gemma 3n 4B (Fast, Efficient)' },
      { value: 'gemma2:9b', name: 'Gemma 2 9B (Balanced)' },
      { value: 'llama3:8b', name: 'Llama 3 8B (General Purpose)' },
      { value: 'mistral:7b', name: 'Mistral 7B (Fast)' },
      { value: 'custom', name: 'Custom Model...' }
    ];

    new Setting(containerEl)
      .setName('Model Selection')
      .setDesc('Choose an Ollama model for AI processing')
      .addDropdown(dropdown => {
        recommendedModels.forEach(model => {
          dropdown.addOption(model.value, model.name);
        });

        const currentModel = this.plugin.settings.ollamaModel;
        const isRecommended = recommendedModels.some(m => m.value === currentModel);
        dropdown.setValue(isRecommended ? currentModel : 'custom');

        dropdown.onChange(async (value) => {
          if (value !== 'custom') {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
            this.plugin.updateServices();
            this.display();
          } else {
            this.display();
          }
        });
      });

    const isCustomModel = !recommendedModels.some(m => m.value === this.plugin.settings.ollamaModel && m.value !== 'custom');

    if (isCustomModel || this.plugin.settings.ollamaModel === '') {
      new Setting(containerEl)
        .setName('Custom Model Name')
        .setDesc('Enter a custom Ollama model name')
        .addText(text => text
          .setPlaceholder('model:tag')
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (value) => {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
            this.plugin.updateServices();
          }));
    }

    const modelInfoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    modelInfoEl.style.marginBottom = '15px';
    modelInfoEl.style.padding = '10px';
    modelInfoEl.style.backgroundColor = 'var(--background-secondary)';
    modelInfoEl.style.borderRadius = '5px';
    modelInfoEl.innerHTML = `
      <strong>Model Recommendations:</strong><br>
      • <strong>Gemma 3n 4B</strong> - Latest efficient model, great for most tasks<br>
      • <strong>Gemma 2 9B</strong> - More capable, requires more RAM<br>
      • Run <code>ollama pull gemma3:4b-it-qat</code> to install Gemma 3n
    `;

    new Setting(containerEl)
      .setName('Test Ollama Connection')
      .setDesc('Verify that Ollama is running and accessible')
      .addButton(button => button
        .setButtonText('Test Connection')
        .onClick(async () => {
          button.setButtonText('Testing...');
          const success = await this.plugin.ollamaService.testConnection();
          if (success) {
            new Notice('✅ Ollama connection successful!');
            const models = await this.plugin.ollamaService.listModels();
            if (models.length > 0) {
              new Notice(`Available models: ${models.join(', ')}`);
            }
          } else {
            new Notice('❌ Failed to connect to Ollama. Is it running?');
          }
          button.setButtonText('Test Connection');
        }));
  }

  private displayGoogleAuthSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '🔗 Google Authentication' });

    const isAuthenticated = this.plugin.googleAuthService.isAuthenticated();
    const hasCredentials = this.plugin.settings.googleClientId && this.plugin.settings.googleClientSecret;

    if (!hasCredentials) {
      const warningEl = containerEl.createEl('div', { cls: 'setting-item-description' });
      warningEl.style.padding = '10px';
      warningEl.style.backgroundColor = 'var(--background-modifier-error)';
      warningEl.style.borderRadius = '5px';
      warningEl.style.marginBottom = '15px';
      warningEl.textContent = 'Please configure your API keys in the section above first.';
      return;
    }

    if (isAuthenticated) {
      const successEl = containerEl.createEl('div', { cls: 'setting-item-description' });
      successEl.style.padding = '10px';
      successEl.style.backgroundColor = 'var(--background-modifier-success)';
      successEl.style.borderRadius = '5px';
      successEl.style.marginBottom = '15px';
      successEl.innerHTML = '✅ <strong>Connected to Google</strong> - Calendar and Gmail features are active.';

      new Setting(containerEl)
        .setName('Disconnect Google Account')
        .setDesc('Remove the connection to your Google account')
        .addButton(button => button
          .setButtonText('Disconnect')
          .setWarning()
          .onClick(async () => {
            await this.plugin.googleAuthService.logout();
            new Notice('Disconnected from Google');
            this.display();
          }));
    } else {
      new Setting(containerEl)
        .setName('Step 1: Authorize with Google')
        .setDesc('Click to open Google authorization page in your browser')
        .addButton(button => button
          .setButtonText('Open Google Authorization')
          .setCta()
          .onClick(() => {
            try {
              const authUrl = this.plugin.googleAuthService.generateAuthUrl();
              window.open(authUrl);
              new Notice('Authorize in your browser, then copy the code and paste it below');
            } catch (error) {
              new Notice('Please configure Client ID and Secret first');
            }
          }));

      new Setting(containerEl)
        .setName('Step 2: Enter Authorization Code')
        .setDesc('After authorizing, Google will display a code. Paste it here.')
        .addText(text => {
          text.setPlaceholder('Paste your authorization code here');
          text.inputEl.style.width = '100%';
          text.inputEl.style.minWidth = '250px';
        })
        .addButton(button => button
          .setButtonText('Connect')
          .setCta()
          .onClick(async () => {
            const input = containerEl.querySelector('input[placeholder="Paste your authorization code here"]') as HTMLInputElement;
            const code = input?.value?.trim();
            if (!code) {
              new Notice('Please enter the authorization code');
              return;
            }
            try {
              button.setButtonText('Connecting...');
              button.setDisabled(true);
              await this.plugin.googleAuthService.exchangeCodeForTokens(code);
              new Notice('✅ Successfully connected to Google!');
              this.display();
            } catch (error) {
              new Notice(`Failed to authenticate: ${error}`);
              button.setButtonText('Connect');
              button.setDisabled(false);
            }
          }));
    }
  }

  private displayPathSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '📁 Note Paths' });

    const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    infoEl.style.marginBottom = '15px';
    infoEl.style.padding = '10px';
    infoEl.style.backgroundColor = 'var(--background-secondary)';
    infoEl.style.borderRadius = '5px';
    infoEl.innerHTML = `Configure where the plugin saves meeting debriefs, daily briefings, inbox triage, and time audits. Make sure these paths exist in your vault.`;

    new Setting(containerEl)
      .setName('Meeting Note Debriefs Folder')
      .setDesc('Folder for meeting debriefs and daily briefings (e.g., Daily Notes)')
      .addText(text => text
        .setPlaceholder('Daily Notes')
        .setValue(this.plugin.settings.dailyNotePath)
        .onChange(async (value) => {
          this.plugin.settings.dailyNotePath = value;
          await this.plugin.saveSettings();
          this.plugin.updateFeatures();
        }));

    if (!this.plugin.settings.dailyNotePath) {
      const warningEl = containerEl.createEl('div', { cls: 'setting-item-description' });
      warningEl.style.padding = '8px 12px';
      warningEl.style.backgroundColor = 'var(--background-modifier-error)';
      warningEl.style.color = 'var(--text-error)';
      warningEl.style.borderRadius = '4px';
      warningEl.style.marginBottom = '15px';
      warningEl.textContent = '⚠ Please specify a folder for meeting debriefs';
    }

    new Setting(containerEl)
      .setName('Inbox Triage Note')
      .setDesc('Path to the inbox triage dashboard note (e.g., Inbox Triage.md)')
      .addText(text => text
        .setPlaceholder('Inbox Triage.md')
        .setValue(this.plugin.settings.inboxNotePath)
        .onChange(async (value) => {
          this.plugin.settings.inboxNotePath = value;
          await this.plugin.saveSettings();
          this.plugin.updateFeatures();
        }));

    if (!this.plugin.settings.inboxNotePath) {
      const warningEl = containerEl.createEl('div', { cls: 'setting-item-description' });
      warningEl.style.padding = '8px 12px';
      warningEl.style.backgroundColor = 'var(--background-modifier-error)';
      warningEl.style.color = 'var(--text-error)';
      warningEl.style.borderRadius = '4px';
      warningEl.style.marginBottom = '15px';
      warningEl.textContent = '⚠ Please specify a path for inbox triage';
    }

    new Setting(containerEl)
      .setName('Weekly Review Note')
      .setDesc('Path to the weekly time audit note (e.g., Weekly Review.md)')
      .addText(text => text
        .setPlaceholder('Weekly Review.md')
        .setValue(this.plugin.settings.weeklyReviewPath)
        .onChange(async (value) => {
          this.plugin.settings.weeklyReviewPath = value;
          await this.plugin.saveSettings();
          this.plugin.updateFeatures();
        }));

    if (!this.plugin.settings.weeklyReviewPath) {
      const warningEl = containerEl.createEl('div', { cls: 'setting-item-description' });
      warningEl.style.padding = '8px 12px';
      warningEl.style.backgroundColor = 'var(--background-modifier-error)';
      warningEl.style.color = 'var(--text-error)';
      warningEl.style.borderRadius = '4px';
      warningEl.style.marginBottom = '15px';
      warningEl.textContent = '⚠ Please specify a path for weekly review';
    }
  }

  private displaySchedulingSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '⏰ Scheduling' });

    new Setting(containerEl)
      .setName('Meeting Debrief Lead Time')
      .setDesc('Minutes before a meeting to generate the debrief')
      .addSlider(slider => slider
        .setLimits(5, 60, 5)
        .setValue(this.plugin.settings.meetingPrepMinutesBefore)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.meetingPrepMinutesBefore = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sync Interval')
      .setDesc('Minutes between Google Calendar/Gmail syncs')
      .addSlider(slider => slider
        .setLimits(5, 60, 5)
        .setValue(this.plugin.settings.syncInterval)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.syncInterval = value;
          await this.plugin.saveSettings();
        }));
  }

  private displayFeatureToggles(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '🎛️ Feature Toggles' });

    new Setting(containerEl)
      .setName('Enable Inbox Triage')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableInboxTriage)
        .onChange(async (value) => {
          this.plugin.settings.enableInboxTriage = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Meeting Prep Debriefs')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableMeetingPrep)
        .onChange(async (value) => {
          this.plugin.settings.enableMeetingPrep = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Weekly Time Audit')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableTimeAudit)
        .onChange(async (value) => {
          this.plugin.settings.enableTimeAudit = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Daily Standup (9 AM)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableDailyStandup)
        .onChange(async (value) => {
          this.plugin.settings.enableDailyStandup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Evening Journal (9 PM)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableEveningJournal)
        .onChange(async (value) => {
          this.plugin.settings.enableEveningJournal = value;
          await this.plugin.saveSettings();
        }));
  }

  private displayAdvancedLLMConfig(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '🧠 Advanced LLM & RAG Configuration' });

    new Setting(containerEl)
      .setName('Instructions System Prompt Path')
      .setDesc('Vault path to instructions.md file that defines AI behavior')
      .addText(text => text
        .setPlaceholder('Chief of Staff/instructions.md')
        .setValue(this.plugin.settings.instructionsPath)
        .onChange(async (value) => {
          this.plugin.settings.instructionsPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Voice Mirroring Style Path')
      .setDesc('Vault path to a markdown file explaining your writing style')
      .addText(text => text
        .setPlaceholder('Chief of Staff/Voice Style.md')
        .setValue(this.plugin.settings.voiceMirrorPath)
        .onChange(async (value) => {
          this.plugin.settings.voiceMirrorPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Personal Contacts Folder')
      .setDesc('Folder for personal people notes')
      .addText(text => text
        .setPlaceholder('People/Personal')
        .setValue(this.plugin.settings.personalContactsFolder)
        .onChange(async (value) => {
          this.plugin.settings.personalContactsFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Work Contacts Folder')
      .setDesc('Folder for work people notes')
      .addText(text => text
        .setPlaceholder('People/Work')
        .setValue(this.plugin.settings.workContactsFolder)
        .onChange(async (value) => {
          this.plugin.settings.workContactsFolder = value;
          await this.plugin.saveSettings();
        }));
  }

  private displayEmailCalendarRules(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '📧 Email & Calendar Rules' });

    new Setting(containerEl)
      .setName('Archive Threshold (Days)')
      .setDesc('Emails older than this limit will be batched into the digest')
      .addText(text => text
        .setPlaceholder('90')
        .setValue(this.plugin.settings.archiveThresholdDays?.toString() || '90')
        .onChange(async (value) => {
          this.plugin.settings.archiveThresholdDays = parseInt(value, 10) || 90;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Newsletter Domains')
      .setDesc('Comma-separated domains to process as newsletters')
      .addTextArea(text => {
        text
          .setPlaceholder('substack.com, medium.com')
          .setValue(this.plugin.settings.newsletterDomains)
          .onChange(async (value) => {
            this.plugin.settings.newsletterDomains = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
        text.inputEl.rows = 3;
      });

    new Setting(containerEl)
      .setName('Personal Event Keywords')
      .setDesc('Comma-separated keywords to identify personal meetings (ignored by Work Prep)')
      .addText(text => text
        .setPlaceholder('Lunch, Gym, Personal')
        .setValue(this.plugin.settings.personalEventKeywords)
        .onChange(async (value) => {
          this.plugin.settings.personalEventKeywords = value;
          await this.plugin.saveSettings();
        }));
  }

  private displayBackgroundServiceConfig(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '⚙️ Background Service Daemon' });

    const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    infoEl.style.marginBottom = '15px';
    infoEl.style.padding = '10px';
    infoEl.style.backgroundColor = 'var(--background-secondary)';
    infoEl.style.borderRadius = '5px';
    infoEl.innerHTML = `This installs the Native OS Daemon (launchd/cron/schtasks) so AI Chief of Staff runs automatically 
    in the background, even when Obsidian is closed.`;

    new Setting(containerEl)
      .setName('Triage Interval (Hours)')
      .setDesc('How often to run the background triage')
      .addDropdown(dropdown => dropdown
        .addOptions({ '1': 'Every Hour', '2': 'Every 2 Hours', '4': 'Every 4 Hours', '8': 'Every 8 Hours' })
        .setValue(this.plugin.settings.triageIntervalHours?.toString() || '4')
        .onChange(async (value) => {
          this.plugin.settings.triageIntervalHours = parseInt(value, 10);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Install Background Service')
      .setDesc('Generates and registers the background OS task based on your configured times')
      .addButton(button => button
        .setButtonText('Install / Update Service')
        .setCta()
        .onClick(async () => {
          button.setButtonText('Installing...');
          button.setDisabled(true);
          try {
            const { exec } = (window as any).require('child_process');
            const path = (window as any).require('path');
            const pluginDir = (this.app.vault.adapter as any).getBasePath() + '/.obsidian/plugins/ai-chief-of-staff/backend';

            // Note: Since this executes in Electron, we can run a node command directly
            exec(`node "${path.join(pluginDir, 'setup-service.mjs')}" "${(this.app.vault.adapter as any).getBasePath()}"`, (error: any, stdout: string, stderr: string) => {
              if (error) {
                new Notice('Failed to install service: ' + error.message);
                console.error(stderr);
              } else {
                new Notice('✅ Background service installed successfully!');
              }
              button.setButtonText('Install / Update Service');
              button.setDisabled(false);
            });
          } catch (e) {
            new Notice('Setup error: ' + String(e));
            button.setButtonText('Install / Update Service');
            button.setDisabled(false);
          }
        }));
  }
}
