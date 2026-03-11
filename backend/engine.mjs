import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Path parameters (will be passed or derived)
const vaultPath = process.argv[2] || process.cwd();
const pluginDataPath = path.join(vaultPath, '.obsidian', 'plugins', 'ai-chief-of-staff', 'data.json');

// Default settings if data.json doesn't exist
const DEFAULT_SETTINGS = {
    enableInboxTriage: true,
    enableMeetingPrep: true,
    enableTimeAudit: true,
    enableDailyStandup: true,
    enableEveningJournal: true,

    ollamaHost: 'http://localhost:11434',
    primaryModel: 'gemma3:4b',
    instructionsPath: 'Chief of Staff/instructions.md',
    voiceMirrorPath: 'Chief of Staff/Voice Style.md',
    personalContactsFolder: 'People/Personal',
    workContactsFolder: 'People/Work',

    archiveThresholdDays: 90,
    newsletterDomains: 'substack.com, medium.com',
    personalEventKeywords: 'Lunch, Gym, Personal',
    triageIntervalHours: 4,
    dailyStandupTime: '09:00',
    eveningJournalTime: '21:00',
};

async function loadSettings() {
    try {
        const data = await fs.readFile(pluginDataPath, 'utf8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
        console.warn('Could not load plugin data.json, using defaults.');
        return DEFAULT_SETTINGS;
    }
}

async function checkInternet() {
    try {
        await execPromise('ping -c 1 8.8.8.8');
        return true;
    } catch {
        return false;
    }
}

async function run() {
    console.log(`Starting AI Chief of Staff Backend Engine in Vault: ${vaultPath}`);
    const settings = await loadSettings();

    const isOnline = await checkInternet();
    if (!isOnline) {
        console.log("Offline mode: Skipping Google APIs, will only run local tasks or wait for next batch.");
    }

    const currentHour = new Date().getHours();

    // Dynamic imports to keep initial load footprint tiny until execution
    const { OllamaAPI } = await import('./ollama.mjs');
    const { GoogleWorkspaceCLI } = await import('./gws.mjs');
    const { QmdRAG } = await import('./rag.mjs');

    const ollama = new OllamaAPI(settings.ollamaUrl, settings.ollamaModel);
    const gws = new GoogleWorkspaceCLI();
    const rag = new QmdRAG(vaultPath);

    // Provide system instructions and voice styling to Ollama context
    const instructions = await rag.getSystemInstructions(settings.instructionsPath);
    const voiceStyle = await rag.getVoiceMirrorStyle(settings.voiceMirrorPath);

    const fullSystemPrompt = `${instructions}\n\nUser Voice Mirroring Guidelines:\n${voiceStyle}\n\nPlease strictly adhere to these instructions.`;

    if (settings.enableDailyStandup && currentHour === parseInt(settings.dailyStandupTime.split(':')[0], 10)) {
        console.log("Running Daily Standup...");
        const standupContext = "Based on yesterday's remaining tasks and today's schedule, what is the #1 priority?";
        const standupDraft = await ollama.generate(standupContext, fullSystemPrompt);
        if (standupDraft) {
            const today = new Date().toISOString().split('T')[0];
            const dailyNotePath = path.join(settings.dailyNotePath, `${today}.md`);
            await rag.safeWriteToDailyNote(dailyNotePath, `\n> [!info] AI Standup\n> ${standupDraft.replace(/\n/g, '\n> ')}`);
        }
    }

    // Interval checks
    if (settings.enableInboxTriage && (currentHour % settings.triageIntervalHours === 0)) {
        console.log("Running Inbox Triage...");
        if (isOnline) {
            const unread = await gws.getUnreadEmails();
            if (unread && unread.length > 0) {
                console.log(`Analyzing ${unread.length} unread emails...`);
                // Draft logic over unread emails using Ollama
                const draft = await ollama.generate(`Summarize the following email and draft a reply if urgent: ${JSON.stringify(unread[0])}`, fullSystemPrompt);

                // If it's a draft piece of logic, we would push it
                if (draft && draft.includes("URGENT")) {
                    await gws.createDraft("sender@example.com", "Re: Urgent Request", draft);
                }
            }
        }
    }

    // Evening Journaling
    if (settings.enableEveningJournal && currentHour === parseInt(settings.eveningJournalTime.split(':')[0], 10)) {
        console.log("Running Evening Journal...");
        const journalPrompt = await ollama.generate("Generate a single, piercingly specific journaling question based on a typical workday to help the user reflect.", fullSystemPrompt);
        if (journalPrompt) {
            const today = new Date().toISOString().split('T')[0];
            const dailyNotePath = path.join(settings.dailyNotePath, `${today}.md`);
            await rag.safeWriteToDailyNote(dailyNotePath, `\n> [!tip] Evening Journal\n> ${journalPrompt.replace(/\n/g, '\n> ')}`);
        }
    }

    console.log("Completed AI Chief of Staff job via background daemon.");
}

run().catch(err => {
    console.error('Fatal Error in backend engine:', err);
});
