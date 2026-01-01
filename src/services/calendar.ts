import { requestUrl } from 'obsidian';
import type { CalendarEvent } from '../types';
import type { GoogleAuthService } from './google-auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class CalendarService {
  private authService: GoogleAuthService;
  private rateLimitBackoff = 1000;

  constructor(authService: GoogleAuthService) {
    this.authService = authService;
  }

  async fetchEvents(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    const accessToken = await this.authService.getValidAccessToken();

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250'
    });

    try {
      const response = await requestUrl({
        url: `${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const data = response.json;
      this.rateLimitBackoff = 1000;

      return (data.items || []).map(this.parseEvent);
    } catch (error: unknown) {
      if (this.isRateLimitError(error)) {
        await this.handleRateLimit();
        return this.fetchEvents(timeMin, timeMax);
      }
      throw error;
    }
  }

  async fetchUpcomingEvents(minutesAhead: number = 60): Promise<CalendarEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + minutesAhead * 60 * 1000);
    return this.fetchEvents(now, future);
  }

  async fetchTodayEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return this.fetchEvents(startOfDay, endOfDay);
  }

  async fetchWeekEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.fetchEvents(startOfWeek, now);
  }

  private parseEvent(item: Record<string, unknown>): CalendarEvent {
    const start = item.start as Record<string, string> | undefined;
    const end = item.end as Record<string, string> | undefined;
    const attendees = item.attendees as Array<{ email: string }> | undefined;

    return {
      id: item.id as string,
      summary: (item.summary as string) || 'No Title',
      description: item.description as string | undefined,
      start: new Date(start?.dateTime || start?.date || ''),
      end: new Date(end?.dateTime || end?.date || ''),
      attendees: attendees?.map(a => a.email) || [],
      location: item.location as string | undefined
    };
  }

  private isRateLimitError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('429');
  }

  private async handleRateLimit(): Promise<void> {
    console.warn(`Rate limited. Backing off for ${this.rateLimitBackoff}ms`);
    await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoff));
    this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, 60000);
  }
}
