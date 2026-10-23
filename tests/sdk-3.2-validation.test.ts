import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ModelFixProcessor, GenkitSpanProcessor } from '@progress/observability';

function createMockSpan(
  attributes: Record<string, any>,
  name = 'test-span',
  spanId = '0000000000000001',
  traceId = '00000000000000000000000000000001'
) {
  return {
    name,
    attributes: { ...attributes },
    spanContext: () => ({
      traceId,
      spanId,
      traceFlags: 1,
    }),
    parentSpanContext: undefined,
  };
}

describe('Validation of Progress SDK v3.2.0 Fixes (Email items from Kalina)', () => {
  describe('Fix 1: Task Spans no longer receive "Unknown" provider', () => {
    it('plain task span without gen_ai attributes does NOT receive "Unknown" provider', () => {
      const taskSpan = createMockSpan(
        {
          'observability.span.kind': 'task',
          'operation': 'sanitize-hotel-payload',
        },
        'sanitizeHotelPayloadTraced'
      );

      const processor = new ModelFixProcessor();
      processor.onEnd(taskSpan as any);

      assert.equal(
        taskSpan.attributes['gen_ai.provider.name'],
        undefined,
        'Should NOT set gen_ai.provider.name="Unknown" on non-LLM task spans'
      );
    });

    it('plain task span with traceloop.span.kind="task" does NOT receive "Unknown" provider', () => {
      const taskSpan = createMockSpan(
        {
          'traceloop.span.kind': 'task',
          'service.method': 'verifyAvailability',
        },
        'BookingService.verifyAvailability'
      );

      const processor = new ModelFixProcessor();
      processor.onEnd(taskSpan as any);

      assert.equal(
        taskSpan.attributes['gen_ai.provider.name'],
        undefined,
        'Should NOT set gen_ai.provider.name="Unknown" when only traceloop.span.kind="task" is present'
      );
    });
  });

  describe('Fix 2: Nested generate spans are classified as workflow instead of agent', () => {
    it('classifies root generate span as "agent"', () => {
      const rootSpan = createMockSpan(
        {
          'genkit:type': 'action',
          'genkit:metadata:subtype': 'util',
          'genkit:name': 'generate',
          'genkit:path': '/{generate,t:action,s:util}',
          'genkit:input': JSON.stringify({ model: 'googleai/gemini-2.5-flash-lite' }),
        },
        'generate'
      );

      const processor = new GenkitSpanProcessor();
      processor.onEnd(rootSpan as any);

      assert.equal(
        rootSpan.attributes['observability.span.kind'],
        'agent',
        'Root generate should be classified as agent'
      );
    });

    it('classifies nested generate span in multi-turn flows as "workflow"', () => {
      const nestedSpan = createMockSpan(
        {
          'genkit:type': 'action',
          'genkit:metadata:subtype': 'util',
          'genkit:name': 'generate',
          'genkit:path': '/{generate,t:action,s:util}/{generate,t:action,s:util}',
          'genkit:input': JSON.stringify({ model: 'googleai/gemini-2.5-flash-lite' }),
        },
        'generate'
      );

      const processor = new GenkitSpanProcessor();
      processor.onEnd(nestedSpan as any);

      assert.equal(
        nestedSpan.attributes['observability.span.kind'],
        'workflow',
        'Nested generate should be classified as workflow (chain/step), not agent'
      );
    });
  });

  describe('Fix 3: Content capture disabled removes genkit:input and genkit:output', () => {
    it('deletes genkit:input and genkit:output when traceContent is false', () => {
      const spanWithContent = createMockSpan(
        {
          'genkit:type': 'action',
          'genkit:metadata:subtype': 'util',
          'genkit:name': 'generate',
          'genkit:input': JSON.stringify({
            messages: [{ role: 'user', content: [{ text: 'Secret passport 12345678' }] }],
          }),
          'genkit:output': JSON.stringify({
            message: { role: 'model', content: [{ text: 'Sensitive booking details' }] },
          }),
        },
        'generate'
      );

      const processor = new GenkitSpanProcessor(false); // traceContent: false
      processor.onEnd(spanWithContent as any);

      assert.equal(
        spanWithContent.attributes['genkit:input'],
        undefined,
        'genkit:input must be deleted when traceContent=false'
      );
      assert.equal(
        spanWithContent.attributes['genkit:output'],
        undefined,
        'genkit:output must be deleted when traceContent=false'
      );
      assert.equal(
        spanWithContent.attributes['gen_ai.input.messages'],
        undefined,
        'gen_ai.input.messages must not be set when traceContent=false'
      );
      assert.equal(
        spanWithContent.attributes['gen_ai.output.messages'],
        undefined,
        'gen_ai.output.messages must not be set when traceContent=false'
      );
    });

    it('retains model and usage metadata even when content is deleted', () => {
      const spanWithUsage = createMockSpan(
        {
          'genkit:type': 'trace',
          'genkit:metadata:subtype': 'model',
          'genkit:name': 'googleai/gemini-2.5-flash-lite',
          'genkit:input': JSON.stringify({
            messages: [{ role: 'user', content: [{ text: 'Tell me a joke' }] }],
          }),
          'genkit:output': JSON.stringify({
            candidates: [{ message: { role: 'model', content: [{ text: 'Why did the chicken...' }] } }],
            usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          }),
        },
        'googleai/gemini-2.5-flash-lite'
      );

      const processor = new GenkitSpanProcessor(false); // traceContent: false
      processor.onEnd(spanWithUsage as any);

      // Content deleted
      assert.equal(spanWithUsage.attributes['genkit:input'], undefined);
      assert.equal(spanWithUsage.attributes['genkit:output'], undefined);
      assert.equal(spanWithUsage.attributes['gen_ai.input.messages'], undefined);
      assert.equal(spanWithUsage.attributes['gen_ai.output.messages'], undefined);

      // Metadata preserved
      assert.equal(spanWithUsage.attributes['gen_ai.provider.name'], 'Google');
      assert.equal(spanWithUsage.attributes['gen_ai.request.model'], 'gemini-2.5-flash-lite');
      assert.equal(spanWithUsage.attributes['gen_ai.usage.input_tokens'], 100);
      assert.equal(spanWithUsage.attributes['gen_ai.usage.output_tokens'], 50);
    });
  });
});
