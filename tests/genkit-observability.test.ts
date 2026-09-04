import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GenkitSpanProcessor } from '@progress/observability';

describe('native Genkit observability support', () => {
  it('maps Genkit model usage to standard model attributes', () => {
    const span = {
      attributes: {
        'genkit:type': 'trace',
        'genkit:metadata:subtype': 'model',
        'genkit:name': 'googleai/gemini-2.5-flash-lite',
        'genkit:output': JSON.stringify({
          usage: {
            inputTokens: 42,
            outputTokens: 17,
            totalTokens: 59,
            thoughtsTokens: 3,
          },
        }),
      },
    };

    new GenkitSpanProcessor().onEnd(span as any);

    assert.equal(span.attributes['gen_ai.provider.name'], 'Google');
    assert.equal(span.attributes['gen_ai.request.model'], 'gemini-2.5-flash-lite');
    assert.equal(span.attributes['gen_ai.response.model'], 'gemini-2.5-flash-lite');
    assert.equal(span.attributes['gen_ai.usage.input_tokens'], 42);
    assert.equal(span.attributes['gen_ai.usage.output_tokens'], 17);
    assert.equal(span.attributes['gen_ai.usage.reasoning.output_tokens'], 3);
  });
});
