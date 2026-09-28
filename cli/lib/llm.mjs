/**
 * The model providers the wizard offers. Every one speaks the OpenAI chat
 * completions protocol, which is all the bot needs — "Other" covers the rest.
 *
 * The model has to be good at tool calling: the bot saves facts and sets
 * reminders through tools, and a model that answers in prose instead quietly
 * remembers nothing.
 */
export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    hint: 'api key from platform.openai.com',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5-mini',
    needsKey: true,
  },
  openrouter: {
    label: 'OpenRouter',
    hint: 'one key, hundreds of models',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-5-mini',
    needsKey: true,
  },
  zai: {
    label: 'Z.ai (GLM)',
    hint: 'what recalfy.com runs on — cheap',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-5.2',
    needsKey: true,
  },
  ollama: {
    label: 'Ollama',
    hint: 'runs on this machine, free, needs a decent GPU',
    // Reached from inside the bot's container, not from this terminal.
    baseUrl: 'http://host.docker.internal:11434/v1',
    probeUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen3:8b',
    needsKey: false,
  },
  other: {
    label: 'Other OpenAI-compatible',
    hint: 'Groq, Together, LM Studio, vLLM…',
    baseUrl: '',
    model: '',
    needsKey: true,
  },
};

/**
 * One tiny real request, so a wrong key or a mistyped model fails here, with
 * the person still at the keyboard, rather than on their first message.
 */
export async function tryModel({ baseUrl, apiKey, model }) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey || 'none'}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the word OK.' }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (response.ok) return { ok: true };

    const body = await response.text();
    let detail = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body);
      detail = parsed.error?.message || parsed.message || detail;
    } catch {}

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: `The key was refused: ${detail}`, field: 'key' };
    }
    if (response.status === 404 || /model/i.test(detail)) {
      return { ok: false, reason: `The model was not accepted: ${detail}`, field: 'model' };
    }
    return { ok: false, reason: `${response.status}: ${detail}` };
  } catch (error) {
    return { ok: false, reason: `Could not reach ${baseUrl}: ${error.message}`, field: 'url' };
  }
}
