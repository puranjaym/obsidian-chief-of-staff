import type { App, TFile } from 'obsidian';
import type { CalendarEvent, MeetingBrief } from '../types';
import type { OllamaService } from '../services/ollama';
import type { CalendarService } from '../services/calendar';
import type { SmartConnectionsService } from '../services/smart-connections';

export class MeetingPrepFeature {
  private app: App;
  private ollama: OllamaService;
  private calendar: CalendarService;
  private smartConnections: SmartConnectionsService;
  private dailyNotePath: string;
  private checkIntervalId: number | null = null;
  private processedEvents: Set<string> = new Set();

  constructor(
    app: App,
    ollama: OllamaService,
    calendar: CalendarService,
    smartConnections: SmartConnectionsService,
    dailyNotePath: string
  ) {
    this.app = app;
    this.ollama = ollama;
    this.calendar = calendar;
    this.smartConnections = smartConnections;
    this.dailyNotePath = dailyNotePath;
  }

  updateConfig(dailyNotePath: string): void {
    this.dailyNotePath = dailyNotePath;
  }

  startAutoCheck(minutesBefore: number = 15): void {
    if (this.checkIntervalId) {
      window.clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = window.setInterval(async () => {
      await this.checkUpcomingMeetings(minutesBefore);
    }, 60000);

    this.checkUpcomingMeetings(minutesBefore);
  }

  stopAutoCheck(): void {
    if (this.checkIntervalId) {
      window.clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  async checkUpcomingMeetings(minutesBefore: number = 15): Promise<void> {
    try {
      const events = await this.calendar.fetchUpcomingEvents(minutesBefore);
      
      for (const event of events) {
        if (this.processedEvents.has(event.id)) continue;
        
        const minutesUntil = (event.start.getTime() - Date.now()) / 60000;
        if (minutesUntil <= minutesBefore && minutesUntil > 0) {
          await this.generateBriefForEvent(event);
          this.processedEvents.add(event.id);
        }
      }

      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      for (const eventId of this.processedEvents) {
        const timestamp = parseInt(eventId.split('_')[0] || '0');
        if (timestamp < yesterday) {
          this.processedEvents.delete(eventId);
        }
      }
    } catch (error) {
      console.error('Failed to check upcoming meetings:', error);
    }
  }

  async generateBriefForEvent(event: CalendarEvent): Promise<MeetingBrief> {
    const searchQueries = [
      event.summary,
      ...event.attendees.slice(0, 3)
    ].filter(Boolean);

    const relatedNotes: string[] = [];
    for (const query of searchQueries) {
      const notes = await this.smartConnections.getRelatedNotes(query, 2);
      relatedNotes.push(...notes);
    }

    const uniqueNotes = [...new Set(relatedNotes)].slice(0, 5);

    const briefContent = await this.ollama.synthesizeMeetingBrief(
      event.summary,
      event.description || '',
      event.attendees,
      uniqueNotes
    );

    const brief: MeetingBrief = {
      eventTitle: event.summary,
      attendees: event.attendees,
      context: briefContent,
      history: '',
      talkingPoints: [],
      generatedAt: new Date()
    };

    await this.writeBriefToDaily(event, briefContent);

    return brief;
  }

  async generateBriefManually(): Promise<void> {
    const events = await this.calendar.fetchTodayEvents();
    const now = new Date();
    
    const upcomingEvents = events.filter(e => e.start > now);
    
    if (upcomingEvents.length === 0) {
      throw new Error('No upcoming events found for today');
    }

    const nextEvent = upcomingEvents[0];
    await this.generateBriefForEvent(nextEvent);
  }

  private async writeBriefToDaily(event: CalendarEvent, briefContent: string): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const dailyNoteName = `${dateStr}.md`;
    const dailyNotePath = `${this.dailyNotePath}/${dailyNoteName}`;

    const briefSection = `

---

## 📋 Meeting Brief: ${event.summary}

**Time:** ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}
**Attendees:** ${event.attendees.join(', ') || 'None listed'}
${event.location ? `**Location:** ${event.location}` : ''}

### Briefing

${briefContent}

*Generated at ${new Date().toLocaleTimeString()}*

---
`;

    let file = this.app.vault.getAbstractFileByPath(dailyNotePath);
    
    if (!file) {
      const folderPath = this.dailyNotePath;
      const folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        await this.app.vault.createFolder(folderPath);
      }
      await this.app.vault.create(dailyNotePath, `# ${dateStr}\n${briefSection}`);
    } else if (file instanceof this.app.vault.adapter.constructor) {
      const content = await this.app.vault.read(file as TFile);
      await this.app.vault.modify(file as TFile, content + briefSection);
    } else {
      const tFile = file as TFile;
      const content = await this.app.vault.read(tFile);
      await this.app.vault.modify(tFile, content + briefSection);
    }
  }
}
