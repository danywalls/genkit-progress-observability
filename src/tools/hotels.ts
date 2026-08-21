import { z } from 'zod';

export const HotelSchema = z.object({
  name: z.string().describe('Hotel name'),
  rating: z.number().describe('Star rating (1-5)'),
  pricePerNight: z.string().describe('Price per night'),
  amenities: z.array(z.string()).describe('Key amenities'),
  familyFriendly: z.boolean().describe('Whether the hotel is family-friendly'),
});

export type Hotel = z.infer<typeof HotelSchema>;

export function normalizeDestination(destination: string): string {
  const normalized = destination.trim().toLowerCase();

  if (normalized.includes('ibiza')) return 'ibiza';
  if (normalized.includes('menorca')) return 'menorca';

  return 'default';
}

const MOCK_HOTELS: Record<string, Hotel[]> = {
  'ibiza': [
    {
      name: 'Hotel Talamanca',
      rating: 4,
      pricePerNight: '€165',
      amenities: ['Beach access', 'Kids pool', 'Restaurant', 'Free WiFi'],
      familyFriendly: true,
    },
    {
      name: 'Playa den Bossa Family Resort',
      rating: 4,
      pricePerNight: '€195',
      amenities: ['Private beach', 'Kids club', 'Pool', 'All-inclusive option'],
      familyFriendly: true,
    },
    {
      name: 'Hostal La Torre',
      rating: 3,
      pricePerNight: '€110',
      amenities: ['Sea view terrace', 'Free WiFi', 'Breakfast included'],
      familyFriendly: true,
    },
  ],
  'menorca': [
    {
      name: 'Hotel Club Santanyi',
      rating: 4,
      pricePerNight: '€145',
      amenities: ['Beach', 'Kids pool', 'Garden', 'Half-board available'],
      familyFriendly: true,
    },
    {
      name: 'Viva Sky Suites',
      rating: 5,
      pricePerNight: '€220',
      amenities: ['Rooftop pool', 'Sea views', 'Spa', 'Kids club'],
      familyFriendly: true,
    },
  ],
  'default': [
    {
      name: 'Beachside Family Hotel',
      rating: 4,
      pricePerNight: '€130',
      amenities: ['Beach', 'Pool', 'Free WiFi', 'Breakfast'],
      familyFriendly: true,
    },
  ],
};

export function getHotelsForDestination(destination: string, stayNights = 3): Hotel[] {
  const key = normalizeDestination(destination);
  const hotels = MOCK_HOTELS[key] ?? MOCK_HOTELS.default;

  if (stayNights < 2) {
    return hotels.filter((hotel) => hotel.rating >= 4);
  }

  return hotels.filter((hotel) => hotel.familyFriendly);
}
