export interface AIChiefOfStaffSettings {
  ollamaUrl: string;
  ollamaModel: string;
  googleClientId: string;
  googleClientSecret: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  googleTokenExpiry: number;
  syncInterval: number;
  calendarSyncToken: string;
  gmailHistoryId: string;
  meetingPrepMinutesBefore: number;
  dailyNotePath: string;
  inboxNotePath: string;
  weeklyReviewPath: string;
}

export const DEFAULT_SETTINGS: AIChiefOfStaffSettings = {
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'gemma2:9b',
  googleClientId: '',
  googleClientSecret: '',
  googleAccessToken: '',
  googleRefreshToken: '',
  googleTokenExpiry: 0,
  syncInterval: 15,
  calendarSyncToken: '',
  gmailHistoryId: '',
  meetingPrepMinutesBefore: 15,
  dailyNotePath: 'Daily Notes',
  inboxNotePath: 'Inbox Triage.md',
  weeklyReviewPath: 'Weekly Review.md'
};

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string;
}

export interface Email {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date;
  labels: string[];
  classification?: 'URGENT' | 'REVIEW' | 'NOISE';
}

export interface MeetingBrief {
  eventTitle: string;
  attendees: string[];
  context: string;
  history: string;
  talkingPoints: string[];
  generatedAt: Date;
}

export interface TimeCategory {
  name: string;
  hours: number;
  percentage: number;
  events: string[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  format?: 'json';
  stream?: boolean;
}
