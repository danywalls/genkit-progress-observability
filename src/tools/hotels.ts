import { wrapFunctionWithSpan, ObservabilitySpanKind } from '@progress/observability';
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

/**
 * Instrument internal tool logic with a dedicated child span using the Progress SDK
 */
export const sanitizeHotelPayloadTraced = wrapFunctionWithSpan(
  sanitizeHotelResults,
  'sanitize-hotel-payload',
  {
    spanKind: ObservabilitySpanKind.TASK,
    tags: ['operation:payload-sanitization'],
  }
);

const MOCK_RAW_HOTELS: Record<string, RawExternalHotel[]> = {
  ibiza: [
    {
      id: 'vnd_ibz_001',
      internal_sku: 'HOTEL-TAL-01',
      display_name: 'Hotel Talamanca',
      stars: 4,
      price_eur: 165,
      cancellation_policy_html: '<p>Free cancellation up to 48 hours before check-in...</p>',
      tax_breakdown: { vat: 16.5, city_tax: 3.3 },
      image_urls: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
      room_variants: [{ code: 'DLX-01', available: 3 }],
      amenities: ['Beach access', 'Kids pool', 'Restaurant', 'Free WiFi', 'Buffet breakfast', 'Spa'],
      affiliate_tracking_url: 'https://affiliate.example.com/track?click=123',
    },
    {
      id: 'vnd_ibz_002',
      internal_sku: 'RESORT-PDB-02',
      display_name: 'Playa den Bossa Family Resort',
      stars: 4,
      price_eur: 195,
      cancellation_policy_html: '<p>Non-refundable rate</p>',
      tax_breakdown: { vat: 19.5, city_tax: 3.9 },
      image_urls: ['https://cdn.example.com/photo3.jpg'],
      room_variants: [{ code: 'STE-02', available: 1 }],
      amenities: ['Private beach', 'Kids club', 'Pool', 'All-inclusive option', 'Tennis court'],
      affiliate_tracking_url: 'https://affiliate.example.com/track?click=456',
    },
    {
      id: 'vnd_ibz_003',
      internal_sku: 'HOSTAL-TORRE-03',
      display_name: 'Hostal La Torre',
      stars: 3,
      price_eur: 110,
      cancellation_policy_html: '<p>Standard cancellation</p>',
      tax_breakdown: { vat: 11.0, city_tax: 2.2 },
      image_urls: ['https://cdn.example.com/photo5.jpg'],
      room_variants: [{ code: 'STD-03', available: 4 }],
      amenities: ['Sea view terrace', 'Free WiFi', 'Breakfast included', 'Bar'],
      affiliate_tracking_url: 'https://affiliate.example.com/track?click=789',
    },
  ],
};

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
  const rawList = MOCK_RAW_HOTELS[key];

  if (rawList && rawList.length > 0) {
    const cleanDtos = (sanitizeHotelPayloadTraced as typeof sanitizeHotelResults)(rawList, 3);
    return cleanDtos.map((dto) => ({
      name: dto.name,
      rating: dto.rating,
      pricePerNight: dto.pricePerNight,
      amenities: dto.keyAmenities,
      familyFriendly: true,
    }));
  }

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
