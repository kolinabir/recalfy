import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requestExtras } from '../src/llm/glm.client';

describe('requestExtras', () => {
  it('keeps the Z.ai request exactly as it was', () => {
    assert.deepEqual(requestExtras('https://api.z.ai/api/paas/v4', 'glm-5.2'), {
      temperature: 0.3,
      thinking: { type: 'disabled' },
    });
  });

  it('never sends the Z.ai extension anywhere else', () => {
    for (const url of ['https://api.openai.com/v1', 'https://openrouter.ai/api/v1', 'http://host.docker.internal:11434/v1']) {
      assert.equal('thinking' in requestExtras(url, 'some-model'), false, url);
    }
  });

  it('leaves temperature at the default for OpenAI reasoning models', () => {
    assert.deepEqual(requestExtras('https://api.openai.com/v1', 'gpt-5-mini'), {});
    assert.deepEqual(requestExtras('https://api.openai.com/v1', 'o4-mini'), {});
    assert.deepEqual(requestExtras('https://api.openai.com/v1', 'gpt-4.1-mini'), { temperature: 0.3 });
  });
});
