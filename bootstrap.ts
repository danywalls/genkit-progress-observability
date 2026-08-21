import '@progress/observability/register/hooks';
import 'dotenv/config';

import { Observability, ObservabilityInstruments } from '@progress/observability';

const apiKey = process.env.OBSERVABILITY_API_KEY;
if (!apiKey) throw new Error('OBSERVABILITY_API_KEY is not set');

const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) throw new Error('GOOGLE_API_KEY is not set');

await Observability.instrument({
  appName: process.env.OBSERVABILITY_APP_NAME ?? 'family-travel-planner',
  apiKey,
  instruments: new Set([ObservabilityInstruments.GOOGLE_GENERATIVEAI]),
  traceContent: true,
});

await import('./src/app.js');
