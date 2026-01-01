import type { App } from 'obsidian';

interface SmartConnectionsResult {
  path: string;
  score: number;
  text: string;
}

interface SmartConnectionsPlugin {
  api?: {
    search: (query: string, options?: { limit?: number }) => Promise<SmartConnectionsResult[]>;
  };
}

interface ObsidianAppWithPlugins extends App {
  plugins: {
    plugins: Record<string, SmartConnectionsPlugin>;
  };
}

export class SmartConnectionsService {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  isAvailable(): boolean {
    const appWithPlugins = this.app as unknown as ObsidianAppWithPlugins;
    return !!(appWithPlugins.plugins?.plugins?.['smart-connections']);
  }

  private getPlugin(): SmartConnectionsPlugin | null {
    const appWithPlugins = this.app as unknown as ObsidianAppWithPlugins;
    return appWithPlugins.plugins?.plugins?.['smart-connections'] || null;
  }

  async search(query: string, limit: number = 5): Promise<{ path: string; content: string; score: number }[]> {
    const sc = this.getPlugin();
    
    if (!sc?.api?.search) {
      console.warn('Smart Connections plugin not available or API not exposed');
      return this.fallbackSearch(query, limit);
    }

    try {
      const results = await sc.api.search(query, { limit });
      return results.map(r => ({
        path: r.path,
        content: r.text,
        score: r.score
      }));
    } catch (error) {
      console.error('Smart Connections search failed:', error);
      return this.fallbackSearch(query, limit);
    }
  }

  private async fallbackSearch(query: string, limit: number): Promise<{ path: string; content: string; score: number }[]> {
    const files = this.app.vault.getMarkdownFiles();
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: { path: string; content: string; score: number }[] = [];

    for (const file of files.slice(0, 100)) {
      try {
        const content = await this.app.vault.cachedRead(file);
        const contentLower = content.toLowerCase();
        
        let score = 0;
        for (const term of queryTerms) {
          if (contentLower.includes(term)) score++;
          if (file.basename.toLowerCase().includes(term)) score += 2;
        }

        if (score > 0) {
          results.push({
            path: file.path,
            content: content.substring(0, 2000),
            score
          });
        }
      } catch {
        continue;
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async getRelatedNotes(context: string, limit: number = 3): Promise<string[]> {
    const results = await this.search(context, limit);
    return results.map(r => r.content);
  }

  async searchForPerson(name: string): Promise<string[]> {
    const results = await this.search(name, 3);
    return results.map(r => r.content);
  }

  async searchForTopic(topic: string): Promise<string[]> {
    const results = await this.search(topic, 5);
    return results.map(r => r.content);
  }
}
