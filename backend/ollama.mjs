import "http";

export class OllamaAPI {
    constructor(host, defaultModel) {
        this.host = host || 'http://127.0.0.1:11434';
        this.defaultModel = defaultModel || 'gemma3:4b-it-qat';
    }

    async generate(prompt, system = '') {
        try {
            const response = await fetch(`${this.host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.defaultModel,
                    prompt: prompt,
                    system: system,
                    stream: false
                })
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.response;
        } catch (err) {
            console.error('Failed to communicate with Ollama:', err);
            return null;
        }
    }
}
