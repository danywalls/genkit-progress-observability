import { z } from 'zod';

export const ActivitySchema = z.object({
  name: z.string().describe('Activity or attraction name'),
  category: z.string().describe('Category (water-sport, cultural, nature, dining, family-fun)'),
  costPerPerson: z.string().describe('Cost per person'),
  duration: z.string().describe('Approximate duration'),
  minAge: z.number().describe('Minimum recommended age'),
  description: z.string().describe('Brief description of the activity'),
});

export type Activity = z.infer<typeof ActivitySchema>;

export function normalizeDestination(destination: string): string {
  const normalized = destination.trim().toLowerCase();

  if (normalized.includes('ibiza')) return 'ibiza';
  if (normalized.includes('menorca')) return 'menorca';

  return 'default';
}

const MOCK_ACTIVITIES: Record<string, Activity[]> = {
  'ibiza': [
    {
      name: 'Catamaran Sunset Cruise',
      category: 'water-sport',
      costPerPerson: '€45',
      duration: '3 hours',
      minAge: 4,
      description: 'Sail along the Ibizan coast, swim in crystal-clear coves, and watch the sunset from the water.',
    },
    {
      name: 'Dalt Vila Museum & Old Town',
      category: 'cultural',
      costPerPerson: '€12',
      duration: '2 hours',
      minAge: 5,
      description: 'Explore the charming Dalt Vila (UNESCO World Heritage) with its cobblestone streets and panoramic views.',
    },
    {
      name: 'Beniras Beach Snorkeling',
      category: 'water-sport',
      costPerPerson: '€30',
      duration: 'Half day',
      minAge: 6,
      description: 'Snorkel in the calm, turquoise waters of Playa de Beniras with underwater visibility up to 20 meters.',
    },
    {
      name: 'Cala Conta Family Beach Day',
      category: 'family-fun',
      costPerPerson: 'Free',
      duration: 'Full day',
      minAge: 0,
      description: "One of Ibiza's most beautiful beaches with shallow, calm waters perfect for young children.",
    },
    {
      name: 'San Juan Market & Paella',
      category: 'dining',
      costPerPerson: '€25',
      duration: '3 hours',
      minAge: 3,
      description: 'Visit the Sunday hippy market in San Juan, followed by fresh seafood paella at a beachfront restaurant.',
    },
    {
      name: 'Aquaworld Waterpark',
      category: 'family-fun',
      costPerPerson: '€28',
      duration: 'Half day',
      minAge: 3,
      description: 'Water slides, lazy river, and splash zones designed for families with young children.',
    },
    {
      name: 'Es Vedrà Boat Trip',
      category: 'nature',
      costPerPerson: '€40',
      duration: '2 hours',
      minAge: 4,
      description: 'Boat trip to the mystical rock island of Es Vedrà, with dolphin spotting opportunities.',
    },
  ],
  'menorca': [
    {
      name: 'Cala Macarella Beach',
      category: 'family-fun',
      costPerPerson: 'Free',
      duration: 'Full day',
      minAge: 0,
      description: 'Iconic turquoise beach with natural cliffs and shallow waters ideal for toddlers.',
    },
    {
      name: 'Ciutadella Boat Tour',
      category: 'cultural',
      costPerPerson: '€20',
      duration: '2 hours',
      minAge: 3,
      description: 'Tour the historic harbor of Ciutadella with stops at hidden coves.',
    },
  ],
  'default': [
    {
      name: 'Local Beach Day',
      category: 'family-fun',
      costPerPerson: 'Free',
      duration: 'Full day',
      minAge: 0,
      description: 'Relax at a nearby beach with calm waters and family facilities.',
    },
    {
      name: 'City Walking Tour',
      category: 'cultural',
      costPerPerson: '€15',
      duration: '2 hours',
      minAge: 5,
      description: 'Guided walking tour of the city center and historical sites.',
    },
  ],
};

export function getActivitiesForDestination(destination: string, numAdults = 2, numKids = 2): Activity[] {
  const key = normalizeDestination(destination);
  const activities = MOCK_ACTIVITIES[key] ?? MOCK_ACTIVITIES.default;
  const maxRecommendedAge = Math.max(0, 8 - Math.max(numKids, 1));

  return activities.filter((activity) => activity.minAge <= maxRecommendedAge || activity.category === 'family-fun');
}
