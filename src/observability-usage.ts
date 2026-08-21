import { Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

type UsageLike = Partial<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    thoughtsTokens?: number;
    cachedContentTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
}>;

const setIfDefined = (span: Span, key: string, value: number | undefined): void => {
    if (value === undefined || value === null) return;
    span.setAttribute(key, value);
};

export function attachUsageMetricsToActiveSpan(span: Span | null | undefined, usage: UsageLike | undefined): void {
    const activeSpan = span ?? trace.getActiveSpan();
    if (!activeSpan) return;

    const inputTokens = usage?.inputTokens ?? usage?.promptTokens;
    const outputTokens = usage?.outputTokens ?? usage?.completionTokens;

    setIfDefined(activeSpan, 'gen_ai.usage.input_tokens', inputTokens);
    setIfDefined(activeSpan, 'gen_ai.usage.output_tokens', outputTokens);
    setIfDefined(activeSpan, 'gen_ai.usage.total_tokens', usage?.totalTokens);
    setIfDefined(activeSpan, 'gen_ai.usage.reasoning_tokens', usage?.thoughtsTokens);
    setIfDefined(activeSpan, 'gen_ai.usage.cache_read_input_tokens', usage?.cachedContentTokens);
}

export function recordModelUsageSpan(modelName: string, usage: UsageLike | undefined): void {
    const tracer = trace.getTracer('genkit-progress-observability');

    tracer.startActiveSpan(modelName, { kind: SpanKind.CLIENT }, (span) => {
        span.setAttribute('gen_ai.provider.name', 'Google');
        span.setAttribute('gen_ai.request.model', modelName);
        span.setAttribute('gen_ai.response.model', modelName);
        attachUsageMetricsToActiveSpan(span, usage);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
    });
}