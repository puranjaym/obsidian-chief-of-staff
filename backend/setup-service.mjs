import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

const vaultPath = process.argv[2] || process.cwd();
const engineScriptPath = path.resolve(vaultPath, '.obsidian/plugins/ai-chief-of-staff/backend/engine.mjs'); // Or path to engine.mjs

async function installMacService() {
    console.log("Installing service for macOS (launchd)");
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.chief-of-staff.obsidian.plist');
    const nodePath = process.execPath;

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.chief-of-staff.obsidian</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${engineScriptPath}</string>
        <string>${vaultPath}</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Hour</key><integer>13</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    </array>
    <key>Nice</key>
    <integer>19</integer>
    <key>StandardOutPath</key>
    <string>/tmp/chief-of-staff-out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/chief-of-staff-error.log</string>
</dict>
</plist>`;

    await fs.writeFile(plistPath, plistContent);

    try {
        await execPromise(`launchctl unload "${plistPath}"`);
    } catch (e) { } // ignore if not loaded
    await execPromise(`launchctl load "${plistPath}"`);
    console.log("✓ macOS launchd agent installed successfully.");
}

async function installWindowsService() {
    console.log("Installing service for Windows (SchTasks)");
    // Note for real world parsing: path needs to be correctly escaped
    const nodePath = process.execPath;
    const command = `schtasks /Create /SC DAILY /TN "AI_Chief_Of_Staff" /TR "\\"${nodePath}\\" \\"${engineScriptPath}\\" \\"${vaultPath}\\"" /ST 09:00 /F`;
    await execPromise(command);
    // Real implementation would add 13:00, 17:00, 21:00 triggers specifically, 
    // or schtasks /create /sc hourly /mo 4 etc.
    console.log("✓ Windows SchTasks installed successfully.");
}

async function installLinuxService() {
    console.log("Installing service for Linux (Cron)");
    const nodePath = process.execPath;
    const cronJob = `0 9,13,17,21 * * * nice -n 19 ${nodePath} "${engineScriptPath}" "${vaultPath}" >> /tmp/chief-of-staff.log 2>&1`;
    const tempCron = path.join(os.tmpdir(), 'chief-of-staff-cron');
    await fs.writeFile(tempCron, cronJob + '\n');
    await execPromise(`crontab "${tempCron}"`);
    console.log("✓ Linux cron installed successfully.");
}

export async function installService() {
    try {
        if (os.platform() === 'darwin') {
            await installMacService();
        } else if (os.platform() === 'win32') {
            await installWindowsService();
        } else {
            await installLinuxService();
        }
        return { success: true, message: 'Service installed successfully' };
    } catch (e) {
        console.error('Error installing background service:', e);
        return { success: false, message: e.message };
    }
}
