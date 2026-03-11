import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class GoogleWorkspaceCLI {

    constructor() { }

    async getUnreadEmails(daysOld = 0) {
        // Query to gws CLI to list messages. (Actual gws syntax varies: gws gmail list -q "is:unread")
        let query = 'is:unread category:primary';
        if (daysOld > 0) {
            query += ` older_than:${daysOld}d`;
        }
        try {
            const { stdout } = await execPromise(`gws gmail messages list --query="${query}" --format=json`);
            if (!stdout.trim()) return [];
            return JSON.parse(stdout);
        } catch (e) {
            console.error("GWS Gmail List failed:", e.message);
            return [];
        }
    }

    async getCalendarEvents(dateStr = 'today') {
        // Mock query - true GWS would be gws calendar events list --timeMin etc.
        try {
            const { stdout } = await execPromise(`gws calendar events list --time="${dateStr}" --format=json`);
            if (!stdout.trim()) return [];
            return JSON.parse(stdout);
        } catch (e) {
            console.error("GWS Calendar List failed:", e.message);
            return [];
        }
    }

    async createDraft(to, subject, body) {
        // Creating a draft via GWS
        // Escaping body properly is required for real bash. We'll use a temp file in a real run.
        try {
            const cmd = `gws gmail drafts create --to="${to}" --subject="${subject}" --body="${body.replace(/"/g, '\\"')}"`;
            await execPromise(cmd);
            return true;
        } catch (e) {
            console.error("GWS Draft Create failed:", e.message);
            return false;
        }
    }
}
