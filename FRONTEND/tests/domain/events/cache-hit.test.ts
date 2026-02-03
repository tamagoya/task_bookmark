import { CacheHit } from '../../../src/domain/events/cache-hit';

describe('CacheHit', () => {
  describe('create', () => {
    it('should create a valid CacheHit event', () => {
      const event = CacheHit.create('test-cache-key');

      expect(event.eventId).toBeDefined();
      expect(event.cacheKey).toBe('test-cache-key');
      expect(event.hitAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = CacheHit.create('test-cache-key');
      const event2 = CacheHit.create('test-cache-key');

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
