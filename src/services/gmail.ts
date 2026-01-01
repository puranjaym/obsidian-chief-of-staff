import { requestUrl } from 'obsidian';
import type { Email } from '../types';
import type { GoogleAuthService } from './google-auth';

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1';

export class GmailService {
  private authService: GoogleAuthService;
  private rateLimitBackoff = 1000;

  constructor(authService: GoogleAuthService) {
    this.authService = authService;
  }

  async fetchUnreadEmails(maxResults: number = 20): Promise<Email[]> {
    const accessToken = await this.authService.getValidAccessToken();

    const params = new URLSearchParams({
      q: 'is:unread',
      maxResults: maxResults.toString()
    });

    try {
      const response = await requestUrl({
        url: `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const data = response.json;
      this.rateLimitBackoff = 1000;

      if (!data.messages || data.messages.length === 0) {
        return [];
      }

      const emails: Email[] = [];
      for (const msg of data.messages.slice(0, maxResults)) {
        const email = await this.fetchEmailDetails(msg.id, accessToken);
        if (email) emails.push(email);
      }

      return emails;
    } catch (error: unknown) {
      if (this.isRateLimitError(error)) {
        await this.handleRateLimit();
        return this.fetchUnreadEmails(maxResults);
      }
      throw error;
    }
  }

  private async fetchEmailDetails(messageId: string, accessToken: string): Promise<Email | null> {
    try {
      const response = await requestUrl({
        url: `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const data = response.json;
      const headers = data.payload?.headers || [];
      
      const getHeader = (name: string): string => {
        const header = headers.find((h: { name: string; value: string }) => 
          h.name.toLowerCase() === name.toLowerCase()
        );
        return header?.value || '';
      };

      return {
        id: data.id,
        threadId: data.threadId,
        from: getHeader('From'),
        subject: getHeader('Subject'),
        snippet: data.snippet || '',
        date: new Date(parseInt(data.internalDate)),
        labels: data.labelIds || []
      };
    } catch (error) {
      console.error(`Failed to fetch email ${messageId}:`, error);
      return null;
    }
  }

  async fetchEmailBody(messageId: string): Promise<string> {
    const accessToken = await this.authService.getValidAccessToken();

    try {
      const response = await requestUrl({
        url: `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const data = response.json;
      return this.extractBody(data.payload);
    } catch (error) {
      console.error(`Failed to fetch email body ${messageId}:`, error);
      return '';
    }
  }

  private extractBody(payload: Record<string, unknown>): string {
    if (payload.body && (payload.body as { data?: string }).data) {
      return this.decodeBase64((payload.body as { data: string }).data);
    }

    const parts = payload.parts as Array<Record<string, unknown>> | undefined;
    if (parts) {
      for (const part of parts) {
        const mimeType = part.mimeType as string;
        if (mimeType === 'text/plain') {
          const body = part.body as { data?: string } | undefined;
          if (body?.data) {
            return this.decodeBase64(body.data);
          }
        }
        if (part.parts) {
          const nested = this.extractBody(part);
          if (nested) return nested;
        }
      }
    }

    return '';
  }

  private decodeBase64(encoded: string): string {
    try {
      const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
      return decoded;
    } catch {
      return '';
    }
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
