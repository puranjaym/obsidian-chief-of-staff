import { requestUrl } from 'obsidian';
import type AIChiefOfStaffPlugin from '../main';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

export class GoogleAuthService {
  private plugin: AIChiefOfStaffPlugin;

  constructor(plugin: AIChiefOfStaffPlugin) {
    this.plugin = plugin;
  }

  generateAuthUrl(): string {
    const { googleClientId } = this.plugin.settings;
    
    if (!googleClientId) {
      throw new Error('Google Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<void> {
    const { googleClientId, googleClientSecret } = this.plugin.settings;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google credentials not configured');
    }

    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'authorization_code'
      }).toString()
    });

    const data = response.json;

    this.plugin.settings.googleAccessToken = data.access_token;
    this.plugin.settings.googleRefreshToken = data.refresh_token || this.plugin.settings.googleRefreshToken;
    this.plugin.settings.googleTokenExpiry = Date.now() + (data.expires_in * 1000);
    
    await this.plugin.saveSettings();
  }

  async refreshAccessToken(): Promise<string> {
    const { googleClientId, googleClientSecret, googleRefreshToken } = this.plugin.settings;

    if (!googleRefreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: googleRefreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    const data = response.json;

    this.plugin.settings.googleAccessToken = data.access_token;
    this.plugin.settings.googleTokenExpiry = Date.now() + (data.expires_in * 1000);
    
    await this.plugin.saveSettings();

    return data.access_token;
  }

  async getValidAccessToken(): Promise<string> {
    const { googleAccessToken, googleTokenExpiry } = this.plugin.settings;

    if (!googleAccessToken) {
      throw new Error('Not authenticated. Please login to Google.');
    }

    if (Date.now() >= googleTokenExpiry - 60000) {
      return this.refreshAccessToken();
    }

    return googleAccessToken;
  }

  isAuthenticated(): boolean {
    return !!(this.plugin.settings.googleAccessToken && this.plugin.settings.googleRefreshToken);
  }

  async logout(): Promise<void> {
    this.plugin.settings.googleAccessToken = '';
    this.plugin.settings.googleRefreshToken = '';
    this.plugin.settings.googleTokenExpiry = 0;
    this.plugin.settings.calendarSyncToken = '';
    this.plugin.settings.gmailHistoryId = '';
    await this.plugin.saveSettings();
  }
}
