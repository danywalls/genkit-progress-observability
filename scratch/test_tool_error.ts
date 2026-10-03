import '../bootstrap.js';
import { Observability, propagateAttributes, wrapFunctionWithSpan, ObservabilitySpanKind } from '@progress/observability';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-3.5-flash-lite',
});

const failingTool = ai.defineTool(
  {
    name: 'failing-lookup-tool',
    description: 'A tool that fails with a runtime exception to test observability error handling.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ status: z.string() }),
  },
  async ({ query }) => {
    console.log('[tool:failing-lookup-tool] Intentional failure triggered for query:', query);
    throw new Error(`External API Timeout (HTTP 504 Gateway Timeout for "${query}")`);
  }
);

async function runErrorAgent() {
  console.log('Testing Agent Tool Failure Observability...\n');
  try {
    await propagateAttributes(['test:error-handling', 'tier:qa-audit'], async () => {
      const response = await ai.generate({
        prompt: 'Use failing-lookup-tool with query "test-hotel-search" immediately.',
        tools: [failingTool],
      });
      console.log('Response:', response.text);
    });
  } catch (err: any) {
    console.log('Agent caught expected error:', err.message);
  } finally {
    await Observability.shutdown();
  }
}

runErrorAgent();
