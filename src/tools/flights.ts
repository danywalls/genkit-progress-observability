import { z } from 'zod';

export const FlightSchema = z.object({
  airline: z.string().describe('Airline name'),
  departure: z.string().describe('Departure time'),
  arrival: z.string().describe('Arrival time'),
  price: z.string().describe('Price per person'),
  stops: z.number().describe('Number of stops'),
});

export type Flight = z.infer<typeof FlightSchema>;

export function normalizeDestination(destination: string): string {
  const normalized = destination.trim().toLowerCase();

  if (normalized.includes('ibiza')) return 'ibiza';
  if (normalized.includes('menorca')) return 'menorca';

  return 'default';
}

const MOCK_FLIGHTS: Record<string, Flight[]> = {
  'ibiza': [
    { airline: 'Vueling', departure: '07:15 AM', arrival: '09:00 AM', price: '€85', stops: 0 },
    { airline: 'Ryanair', departure: '10:30 AM', arrival: '12:15 PM', price: '€62', stops: 0 },
    { airline: 'Iberia Express', departure: '02:00 PM', arrival: '03:45 PM', price: '€110', stops: 0 },
    { airline: 'Air Europa', departure: '06:45 PM', arrival: '08:30 PM', price: '€78', stops: 0 },
  ],
  'menorca': [
    { airline: 'Vueling', departure: '08:00 AM', arrival: '08:55 AM', price: '€72', stops: 0 },
    { airline: 'Ryanair', departure: '01:15 PM', arrival: '02:10 PM', price: '€55', stops: 0 },
  ],
  'default': [
    { airline: 'Vueling', departure: '09:00 AM', arrival: '11:00 AM', price: '€95', stops: 0 },
    { airline: 'Ryanair', departure: '03:00 PM', arrival: '05:00 PM', price: '€68', stops: 1 },
  ],
};

export function getFlightsForDestination(destination: string, numPassengers = 1): Flight[] {
  const key = normalizeDestination(destination);
  const flights = MOCK_FLIGHTS[key] ?? MOCK_FLIGHTS.default;

  if (numPassengers <= 2) {
    return flights;
  }

  return flights.map((flight, index) => {
    const basePrice = Number.parseInt(flight.price.replace(/[^0-9]/g, ''), 10) || 0;
    return {
      ...flight,
      price: `€${basePrice + (index + 1) * 6}`,
    };
  });
}
