# Family Travel Planner — Genkit + Progress AI Observability

An AI agent that plans family vacations using [Genkit](https://genkit.dev/) and monitors everything with [Progress AI Observability Platform](https://www.telerik.com/ai-observability-platform).

## What it does

Takes a destination, family size, and budget, then uses tools to:
- Search for flights
- Find family-friendly hotels
- Discover kid-appropriate activities
- Generate a structured travel plan with cost estimates

## Quick start

```bash
npm install
cp .env.example .env   # add your API keys
npx tsx bootstrap.ts
```

## Prerequisites

- Node.js 18+
- [Google AI Studio](https://aistudio.google.com/apikey) API key
- [Progress Observability](https://observability.progress.com) Integration key (`ac_p_...`)

## Project structure

```
├── bootstrap.ts          # Entry point with Progress instrumentation
├── src/
│   ├── app.ts            # Main application
│   ├── agent.ts          # Genkit agent + tools
│   └── tools/
│       ├── flights.ts    # Flight search
│       ├── hotels.ts     # Hotel search
│       └── activities.ts # Activities search
└── ARTICLE.md            # Full tutorial
```

## Observability

Traces are sent to Progress Observability Platform automatically. Open [observability.progress.com](https://observability.progress.com) to see:
- Agent trace with tool calls and LLM interactions
- Token usage and cost analytics
- Prompt/response content (when `traceContent: true`)



## License

MIT
