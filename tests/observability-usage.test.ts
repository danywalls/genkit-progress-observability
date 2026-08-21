import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attachUsageMetricsToActiveSpan } from '../src/observability-usage.js';

describe('attachUsageMetricsToActiveSpan', () => {
    it('maps Genkit usage fields to the OpenTelemetry span attributes Progress reads', () => {
        const seen: Record<string, number> = {};
        const fakeSpan = {
            setAttribute(name: string, value: number) {
                seen[name] = value;
            },
        };

        attachUsageMetricsToActiveSpan(fakeSpan as any, {
            inputTokens: 42,
            outputTokens: 17,
            totalTokens: 59,
        });

        assert.equal(seen['gen_ai.usage.input_tokens'], 42);
        assert.equal(seen['gen_ai.usage.output_tokens'], 17);
        assert.equal(seen['gen_ai.usage.total_tokens'], 59);
    });
});
