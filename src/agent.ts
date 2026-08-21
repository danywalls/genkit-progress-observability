import { wrapFunctionWithSpan, ObservabilitySpanKind } from '@progress/observability';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { recordModelUsageSpan } from './observability-usage.js';
import { getFlightsForDestination, FlightSchema } from './tools/flights.js';
import { getHotelsForDestination, HotelSchema } from './tools/hotels.js';
import { getActivitiesForDestination, ActivitySchema } from './tools/activities.js';

const normalizeModelName = (value: string | undefined): string => {
  const candidate = value?.trim() ?? 'gemini-2.5-flash-lite';
  const withoutProvider = candidate.replace(/^googleai\//i, '');
  return `googleai/${withoutProvider}`;
};

const modelName = normalizeModelName(process.env.GEMINI_MODEL);

const ai = genkit({
  plugins: [googleAI()],
  model: modelName,
});

function validateTravelRequest(
  destination: string,
  numAdults: number,
  numKids: number,
  kidAges: number[],
  budget: string
): void {
  if (!destination.trim()) {
    throw new Error('Destination is required.');
  }

  if (numAdults < 1 || numKids < 0) {
    throw new Error('Number of adults must be at least 1 and kids cannot be negative.');
  }

  if (kidAges.length && kidAges.length !== numKids) {
    throw new Error('The number of kid ages must match the number of kids.');
  }

  if (kidAges.some((age) => age < 0 || age > 18)) {
    throw new Error('Kid ages must be between 0 and 18.');
  }

  const normalizedBudget = budget.trim().toLowerCase();
  if (!['budget', 'moderate', 'luxury', 'comfortable'].includes(normalizedBudget)) {
    throw new Error('Budget is invalid. Use budget, moderate, comfortable or luxury.');
  }
}

const findFlightsTool = ai.defineTool(
  {
    name: 'find-flights',
    description: 'Search for family-friendly flights to a destination.',
    inputSchema: z.object({
      destination: z.string(),
      numPassengers: z.number(),
    }),
    outputSchema: z.array(FlightSchema),
  },
  async ({ destination, numPassengers }) => {
    console.log(`[tool:find-flights] Searching flights to ${destination} for ${numPassengers} passengers`);
    return getFlightsForDestination(destination, numPassengers);
  }
);

const findHotelsTool = ai.defineTool(
  {
    name: 'find-hotels',
    description: 'Search for family-friendly hotels at a destination.',
    inputSchema: z.object({
      destination: z.string(),
      checkIn: z.string(),
      checkOut: z.string(),
    }),
    outputSchema: z.array(HotelSchema),
  },
  async ({ destination, checkIn, checkOut }) => {
    console.log(`[tool:find-hotels] Searching hotels in ${destination} from ${checkIn} to ${checkOut}`);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nightCount = Number.isFinite(checkInDate.getTime()) && Number.isFinite(checkOutDate.getTime())
      ? Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 3;

    return getHotelsForDestination(destination, nightCount);
  }
);

const findActivitiesTool = ai.defineTool(
  {
    name: 'find-activities',
    description: 'Find family-friendly activities and attractions at a destination.',
    inputSchema: z.object({
      destination: z.string(),
      numAdults: z.number(),
      numKids: z.number(),
    }),
    outputSchema: z.array(ActivitySchema),
  },
  async ({ destination, numAdults, numKids }) => {
    console.log(`[tool:find-activities] Finding activities in ${destination} for ${numAdults} adults and ${numKids} kids`);
    return getActivitiesForDestination(destination, numAdults, numKids);
  }
);

const TravelPlanSchema = z.object({
  destination: z.string().describe('The travel destination'),
  duration: z.string().describe('Trip duration (e.g., 5 days / 4 nights)'),
  summary: z.string().describe('Brief trip summary for the family'),
  flights: z.array(z.object({
    airline: z.string(),
    departure: z.string(),
    arrival: z.string(),
    price: z.string(),
    stops: z.number(),
  })).describe('Flight options'),
  hotel: z.object({
    name: z.string(),
    rating: z.number(),
    pricePerNight: z.string(),
    amenities: z.array(z.string()),
  }).describe('Recommended hotel'),
  activities: z.array(z.object({
    name: z.string(),
    category: z.string(),
    costPerPerson: z.string(),
    duration: z.string(),
    description: z.string(),
  })).describe('Planned activities'),
  totalEstimatedCost: z.string().describe('Total estimated cost for the family'),
});

export type TravelPlan = z.infer<typeof TravelPlanSchema>;

async function planTripRaw(
  destination: string,
  numAdults: number,
  numKids: number,
  kidAges: number[],
  budget: string
): Promise<TravelPlan> {
  validateTravelRequest(destination, numAdults, numKids, kidAges, budget);

  const numPassengers = numAdults + numKids;
  const normalizedKidAges = kidAges.length ? kidAges : Array.from({ length: numKids }, (_, index) => 7 - index);

  const result = ai.generateStream({
    model: modelName,
    prompt: `You are a local Ibizan family travel expert. Create a detailed travel plan for a family visiting Ibiza.

The family usually vacations in Menorca but is trying Ibiza this year for the first time. They want the relaxed, family-friendly side of the island — not the nightlife scene.

Destination: ${destination}
Number of adults: ${numAdults}
Number of children: ${numKids} (ages: ${normalizedKidAges.join(', ')})
Total passengers: ${numPassengers}
Budget preference: ${budget}

Use the provided tools to find flights, hotels, and activities. Then create a comprehensive travel plan.

IMPORTANT: 
- Focus on Ibiza's quieter, family-oriented areas (Talamanca, Cala Conta, Portinatx, San Juan)
- Recommend activities appropriate for the youngest child's age
- Prioritize beaches with shallow, calm water
- Include at least one cultural experience (Dalt Vila, hippy markets)
- Include at least one water activity (snorkeling, boat trip)
- Provide realistic cost estimates in euros
- Return the results in the exact JSON format requested`,
    tools: [
      findFlightsTool,
      findHotelsTool,
      findActivitiesTool,
    ],
    output: { schema: TravelPlanSchema },
  });

  let outputSeen = false;
  for await (const chunk of result.stream) {
    if (chunk.output && !outputSeen) {
      console.log('[agent:stream] model started producing a structured travel plan');
      outputSeen = true;
    }
  }

  const finalResult = await result.response;
  if (!finalResult.output) {
    throw new Error('Failed to generate travel plan');
  }

  recordModelUsageSpan(modelName, finalResult.usage);

  return finalResult.output;
}

export const planTrip = wrapFunctionWithSpan(
  planTripRaw,
  'family-travel-agent',
  {
    spanKind: ObservabilitySpanKind.AGENT,
    tags: ['travel', 'family', 'genkit'],
  }
) as typeof planTripRaw;
