import { requestUrl } from 'obsidian';
import type { OllamaGenerateRequest, OllamaResponse } from '../types';

const CHIEF_OF_STAFF_SYSTEM_PROMPT = `You are a precise Chief of Staff. You value brevity. You do not explain yourself; you execute. When analyzing text, prioritize actionable facts over sentiment. Only use provided context. If information is unknown, state 'No Data'. Never invent or hallucinate details.`;

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  updateConfig(baseUrl: string, model: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/api/tags`,
        method: 'GET',
      });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/api/tags`,
        method: 'GET',
      });
      const data = response.json;
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generate(prompt: string, systemPrompt?: string, jsonMode = false): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt: prompt,
      system: systemPrompt || CHIEF_OF_STAFF_SYSTEM_PROMPT,
      stream: false,
    };

    if (jsonMode) {
      request.format = 'json';
    }

    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/api/generate`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: OllamaResponse = response.json;
      return data.response;
    } catch (error) {
      console.error('Ollama generate failed:', error);
      throw new Error(`Failed to generate response from Ollama: ${error}`);
    }
  }

  async summarizeNote(content: string): Promise<string> {
    const prompt = `Summarize the following note concisely, highlighting key points, decisions, and action items:

---
${this.truncateContent(content, 6000)}
---

Provide a structured summary with:
- Key Points (bullet points)
- Decisions Made (if any)
- Action Items (if any)
- Next Steps (if any)`;

    return this.generate(prompt);
  }

  async synthesizeMeetingBrief(
    eventTitle: string,
    eventDescription: string,
    attendees: string[],
    relatedNotes: string[]
  ): Promise<string> {
    const notesContext = relatedNotes.length > 0 
      ? relatedNotes.map((n, i) => `[Note ${i + 1}]: ${this.truncateContent(n, 1500)}`).join('\n\n')
      : 'No related notes found in vault.';

    const prompt = `Prepare a meeting brief for the following event:

**Meeting:** ${eventTitle}
**Description:** ${eventDescription || 'No description provided'}
**Attendees:** ${attendees.join(', ') || 'No attendees listed'}

**Related Context from Vault:**
${notesContext}

Generate a briefing note with:
1. **Context**: Who are the attendees? Any relevant background from notes?
2. **History**: Summary of previous discussions with these people/topics
3. **Talking Points**: 3-5 suggested agenda items based on context
4. **Open Questions**: Things that need resolution`;

    return this.generate(prompt);
  }

  async classifyEmails(emails: { from: string; subject: string; snippet: string }[]): Promise<{ id: number; classification: 'URGENT' | 'REVIEW' | 'NOISE'; reason: string }[]> {
    if (emails.length === 0) return [];

    const emailList = emails.map((e, i) => 
      `[${i}] From: ${e.from}\nSubject: ${e.subject}\nPreview: ${e.snippet.substring(0, 200)}`
    ).join('\n\n---\n\n');

    const prompt = `Classify each email into one of three categories:
- URGENT: Requires immediate action, time-sensitive, from important contacts
- REVIEW: Worth reading later, not urgent but potentially valuable
- NOISE: Newsletters, promotions, automated messages, low priority

Emails to classify:
${emailList}

Respond in JSON format:
{
  "classifications": [
    {"id": 0, "classification": "URGENT|REVIEW|NOISE", "reason": "brief reason"},
    ...
  ]
}`;

    const response = await this.generate(prompt, undefined, true);
    
    try {
      const parsed = JSON.parse(response);
      return parsed.classifications || [];
    } catch {
      console.error('Failed to parse email classification response');
      return emails.map((_, i) => ({ id: i, classification: 'REVIEW' as const, reason: 'Classification failed' }));
    }
  }

  async categorizeEvents(events: { id: number; summary: string; duration: number }[]): Promise<{ category: string; eventIndices: number[]; totalHours: number }[]> {
    if (events.length === 0) return [];

    const eventList = events.map(e => `[${e.id}] "${e.summary}" (${e.duration.toFixed(1)}h)`).join('\n');

    const prompt = `Categorize the following calendar events into high-level categories like:
- Deep Work (focused, creative, coding, writing)
- Admin (emails, paperwork, scheduling)
- Meetings (external calls, client meetings)
- Internal (team meetings, 1:1s, standups)
- Personal (breaks, appointments, errands)

Events from last 7 days (format: [id] "title" (duration)):
${eventList}

For each category, provide the list of event IDs (the numbers in brackets) that belong to it.

Respond in JSON format:
{
  "categories": [
    {"name": "Category Name", "eventIds": [0, 2, 5]},
    ...
  ]
}`;

    const response = await this.generate(prompt, undefined, true);
    
    try {
      const parsed = JSON.parse(response);
      const eventDurationMap = new Map(events.map(e => [e.id, e.duration]));
      
      return (parsed.categories || []).map((cat: { name: string; eventIds: number[] }) => {
        const eventIndices = cat.eventIds || [];
        const totalHours = eventIndices.reduce((sum, id) => sum + (eventDurationMap.get(id) || 0), 0);
        return {
          category: cat.name,
          eventIndices,
          totalHours
        };
      });
    } catch {
      console.error('Failed to parse event categorization response');
      return [];
    }
  }

  async draftEmailReply(
    originalEmail: { from: string; subject: string; body: string },
    vaultContext: string,
    instructions?: string
  ): Promise<string> {
    const prompt = `Draft a professional email reply.

**Original Email:**
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${this.truncateContent(originalEmail.body, 2000)}

**Context from your notes:**
${this.truncateContent(vaultContext, 2000)}

${instructions ? `**Special Instructions:** ${instructions}` : ''}

Write a concise, professional reply. Use the context from notes to inform your response. Be helpful but brief.`;

    return this.generate(prompt);
  }

  async queryVaultWithContext(query: string, relevantChunks: string[]): Promise<string> {
    const context = relevantChunks.length > 0
      ? relevantChunks.map((c, i) => `[Chunk ${i + 1}]: ${this.truncateContent(c, 1500)}`).join('\n\n')
      : 'No relevant content found.';

    const prompt = `Answer the following query using ONLY the provided context. If the answer cannot be found in the context, say "No relevant information found in vault."

**Query:** ${query}

**Context from Vault:**
${context}

Provide a clear, concise answer based strictly on the provided context.`;

    return this.generate(prompt);
  }

  private truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    return content.substring(0, maxChars) + '... [truncated]';
  }
}
