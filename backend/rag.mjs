import fs from 'fs/promises';
import path from 'path';

export class QmdRAG {
    constructor(vaultPath) {
        this.vaultPath = vaultPath;
    }

    async getSystemInstructions(instructionRelativePath) {
        const fullPath = path.join(this.vaultPath, instructionRelativePath);
        try {
            const content = await fs.readFile(fullPath, 'utf8');
            return content;
        } catch {
            return `You are an AI Chief of Staff. You help manage the user's focus, time, and communications.`;
        }
    }

    async getVoiceMirrorStyle(voiceRelativePath) {
        const fullPath = path.join(this.vaultPath, voiceRelativePath);
        try {
            return await fs.readFile(fullPath, 'utf8');
        } catch {
            return `Answer clearly and professionally. Use concise bullet points where appropriate.`;
        }
    }

    async findPersonContext(name, personalFolder, workFolder) {
        // Simple search: look for exact name match in the personal/work folders
        for (const folder of [personalFolder, workFolder]) {
            if (!folder) continue;

            const targetNote = path.join(this.vaultPath, folder, `${name}.md`);
            try {
                const stat = await fs.stat(targetNote);
                if (stat.isFile()) {
                    const content = await fs.readFile(targetNote, 'utf8');
                    // Extract Frontmatter and top summary
                    return content.substring(0, 1000); // Return first 1000 chars as context to avoid blowing up prompt window
                }
            } catch (e) {
                // Not found, continue
            }
        }
        return `No explicit context file found for ${name}.`;
    }

    async safeWriteToDailyNote(notePath, contentBlock) {
        const fullPath = path.join(this.vaultPath, notePath);
        const lockPath = fullPath + '.lock';

        // Simple file lock mechanism to prevent Obsidian/CLI collisions
        try {
            await fs.writeFile(lockPath, Date.now().toString(), { flag: 'wx' });

            let existingContent = '';
            try { existingContent = await fs.readFile(fullPath, 'utf8'); } catch (e) { }

            // Append with newline
            const updatedContent = existingContent.endsWith('\\n') ? existingContent + contentBlock : existingContent + '\\n' + contentBlock;

            await fs.writeFile(fullPath, updatedContent, 'utf8');
            await fs.unlink(lockPath);
            return true;
        } catch (e) {
            console.error('Failed to safely write to Daily Note (possibly locked or permission issue):', e.message);
            // Cleanup lock if orphaned
            try { await fs.unlink(lockPath); } catch { }
            return false;
        }
    }
}
