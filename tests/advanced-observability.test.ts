import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context } from '@opentelemetry/api';
import { propagateAttributes, getContextTags } from '@progress/observability';
import { maskName, sanitizeUserNotes } from '../src/utils/privacy.js';
import { getHotelsDefensive, sanitizeHotelResults, sanitizeHotelPayloadTraced, RawExternalHotel } from '../src/tools/hotels.js';
import { BookingService } from '../src/services/booking.js';

describe('Advanced Observability & Production Guardrails', () => {
  before(() => {
    // Ensure OpenTelemetry context propagation is active in unit test environment
    try {
      const manager = new AsyncLocalStorageContextManager();
      manager.enable();
      context.setGlobalContextManager(manager);
    } catch {
      // Already initialized
    }
  });

  describe('Privacy & PII Masking', () => {
    it('masks full names appropriately', () => {
      assert.equal(maskName('Maria Garcia'), 'M**** G*****');
      assert.equal(maskName('Carlos'), 'C*****');
      assert.equal(maskName(''), '');
    });

    it('redacts emails and id patterns from free-form text', () => {
      const input = 'Contact me at parent@example.com with passport 123456789';
      const sanitized = sanitizeUserNotes(input);
      assert.match(sanitized, /\[REDACTED_EMAIL\]/);
      assert.match(sanitized, /\[REDACTED_ID\]/);
      assert.doesNotMatch(sanitized, /parent@example\.com/);
    });
  });

  describe('Defensive Tool Responses (Loop Prevention)', () => {
    it('returns informative NO_MATCHES when budget is unrealistically low', () => {
      const response = getHotelsDefensive('Ibiza', 3, 50);

      assert.equal(response.status, 'NO_MATCHES');
      assert.equal(response.results.length, 0);
      assert.match(response.message, /Do not attempt another hotel search/);
    });

    it('returns informative NO_MATCHES for unsupported destinations', () => {
      const response = getHotelsDefensive('Paris', 3);

      assert.equal(response.status, 'NO_MATCHES');
      assert.equal(response.results.length, 0);
      assert.match(response.message, /Do not retry/);
    });

    it('returns FOUND with certified hotels when parameters are valid', () => {
      const response = getHotelsDefensive('Ibiza', 3, 200);

      assert.equal(response.status, 'FOUND');
      assert.ok(response.results.length > 0);
      assert.equal(response.results[0].name, 'Hotel Talamanca');
    });
  });

  describe('Token Leak Audit & DTO Sanitization', () => {
    it('trims bloated raw payloads down to essential LLM fields', () => {
      const bloatedRawList: RawExternalHotel[] = [
        {
          id: 'ext_9941',
          internal_sku: 'VND-IBZ-01',
          display_name: 'Hotel Talamanca Beach Resort',
          stars: 4,
          price_eur: 165,
          cancellation_policy_html: '<p>Free cancellation up to 48 hours before check-in...</p>',
          tax_breakdown: { vat: 16.5, city_tax: 3.3 },
          image_urls: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
          room_variants: [{ code: 'DLX-01', available: 3 }],
          amenities: ['Beach access', 'Kids pool', 'Free WiFi', 'Buffet breakfast', 'Spa', 'Valet parking'],
          affiliate_tracking_url: 'https://affiliate.example.com/track?click=123',
        },
      ];

      const sanitized = sanitizeHotelResults(bloatedRawList, 1);

      assert.equal(sanitized.length, 1);
      const item = sanitized[0];
      assert.equal(item.name, 'Hotel Talamanca Beach Resort');
      assert.equal(item.rating, 4);
      assert.equal(item.pricePerNight, '€165');
      assert.equal(item.keyAmenities.length, 4); // Capped at top 4
      assert.equal((item as any).cancellation_policy_html, undefined);
      assert.equal((item as any).affiliate_tracking_url, undefined);
    });
  });

  describe('Progress SDK Tag Propagation', () => {
    it('propagates tags down the execution scope', () => {
      const result = propagateAttributes(['user:usr_4102', 'tier:vip'], () => {
        const activeTags = getContextTags();
        return activeTags;
      });

      assert.ok(result.includes('user:usr_4102'));
      assert.ok(result.includes('tier:vip'));
    });
  });

  describe('Standalone Function Tracing with wrapFunctionWithSpan', () => {
    it('executes wrapped payload sanitization and returns clean DTOs', () => {
      const bloatedRawList: RawExternalHotel[] = [
        {
          id: 'vnd_ibz_001',
          internal_sku: 'HOTEL-TAL-01',
          display_name: 'Hotel Talamanca',
          stars: 4,
          price_eur: 165,
          cancellation_policy_html: '<p>Free cancellation</p>',
          tax_breakdown: { vat: 16.5 },
          image_urls: ['https://cdn.example.com/photo1.jpg'],
          room_variants: [{ code: 'DLX-01', available: 3 }],
          amenities: ['Beach access', 'Kids pool', 'Free WiFi', 'Buffet breakfast'],
          affiliate_tracking_url: 'https://affiliate.example.com/track?click=123',
        },
      ];

      const sanitized = (sanitizeHotelPayloadTraced as typeof sanitizeHotelResults)(bloatedRawList, 1);
      assert.equal(sanitized.length, 1);
      assert.equal(sanitized[0].name, 'Hotel Talamanca');
      assert.equal(sanitized[0].rating, 4);
      assert.equal(sanitized[0].pricePerNight, '€165');
      assert.equal((sanitized[0] as any).cancellation_policy_html, undefined);
    });
  });

  describe('Internal Service Instrumentation (@workflow and @task)', () => {
    it('executes decorated booking workflow and confirms reservation', async () => {
      const service = new BookingService();
      const confirmation = await service.bookHotel('usr_4102', 'hotel_talamanca_01');

      assert.equal(confirmation.status, 'CONFIRMED');
      assert.equal(confirmation.hotelId, 'hotel_talamanca_01');
      assert.match(confirmation.reservationId, /^RES-\d+/);
    });
  });
});
