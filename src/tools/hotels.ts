import { z } from 'zod';

export const HotelSchema = z.object({
  name: z.string().describe('Hotel name'),
  rating: z.number().describe('Star rating (1-5)'),
  pricePerNight: z.string().describe('Price per night'),
  amenities: z.array(z.string()).describe('Key amenities'),
  familyFriendly: z.boolean().describe('Whether the hotel is family-friendly'),
});

export type Hotel = z.infer<typeof HotelSchema>;

// Defensive envelope to prevent reasoning loops
export const HotelResponseSchema = z.object({
  status: z.enum(['FOUND', 'NO_MATCHES', 'ERROR']),
  message: z.string().describe('Clear guidance for the model about the search result'),
  results: z.array(HotelSchema),
});

export type HotelResponse = z.infer<typeof HotelResponseSchema>;

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

/**
 * Defensive hotel search that returns actionable feedback when no results match.
 * Prevents LLM reasoning loops.
 */
export function getHotelsDefensive(
  destination: string,
  stayNights = 3,
  maxBudget?: number
): HotelResponse {
  const key = normalizeDestination(destination);

  if (key === 'default') {
    return {
      status: 'NO_MATCHES',
      message: `No partner hotels found in "${destination}". We currently only support Ibiza and Menorca. Do not retry this search.`,
      results: [],
    };
  }

  // Detect unrealistic budget constraints
  if (maxBudget !== undefined && maxBudget < 100) {
    return {
      status: 'NO_MATCHES',
      message: `No certified family-friendly hotels in ${destination} match a budget of €${maxBudget}/night. The lowest rate starts at €110/night. Inform the user to adjust their budget. Do not attempt another hotel search.`,
      results: [],
    };
  }

  const hotels = getHotelsForDestination(destination, stayNights);

  return {
    status: 'FOUND',
    message: `Found ${hotels.length} family-friendly hotel options in ${destination}.`,
    results: hotels,
  };
}

/**
 * Raw vendor response representation (simulating heavy 20+ KB external payloads).
 */
export interface RawExternalHotel {
  id: string;
  internal_sku: string;
  display_name: string;
  stars: number;
  price_eur: number;
  cancellation_policy_html: string;
  tax_breakdown: Record<string, number>;
  image_urls: string[];
  room_variants: Array<{ code: string; available: number }>;
  amenities: string[];
  affiliate_tracking_url: string;
}

/**
 * Sanitized, lightweight DTO for the LLM context.
 */
export interface CleanHotelDTO {
  name: string;
  rating: number;
  pricePerNight: string;
  keyAmenities: string[];
}

/**
 * Trims oversized third-party payloads to prevent token leaks.
 */
export function sanitizeHotelResults(
  rawList: RawExternalHotel[],
  limit = 3
): CleanHotelDTO[] {
  return rawList.slice(0, limit).map((hotel) => ({
    name: hotel.display_name,
    rating: hotel.stars,
    pricePerNight: `€${hotel.price_eur}`,
    keyAmenities: hotel.amenities.slice(0, 4),
  }));
}
