import { CacheMiss } from '../../../src/domain/events/cache-miss';

describe('CacheMiss', () => {
  describe('create', () => {
    it('should create a valid CacheMiss event', () => {
      const event = CacheMiss.create('test-cache-key');

      expect(event.eventId).toBeDefined();
      expect(event.cacheKey).toBe('test-cache-key');
      expect(event.missedAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = CacheMiss.create('test-cache-key');
      const event2 = CacheMiss.create('test-cache-key');

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
