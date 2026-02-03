import { CacheManagementService } from '../../../src/domain/services/cache-management-service';
import { CacheStrategy } from '../../../src/domain/value-objects/cache-strategy';

describe('CacheManagementService', () => {
  let service: CacheManagementService;

  beforeEach(() => {
    service = new CacheManagementService();
  });

  describe('getCacheKey', () => {
    it('should generate cache key from operation name and params', () => {
      const key = service.getCacheKey('test-operation', { a: 1, b: 'test' });

      expect(key).toContain('test-operation');
      expect(key).toContain('a');
      expect(key).toContain('b');
    });

    it('should generate consistent keys for same params', () => {
      const key1 = service.getCacheKey('test-operation', { a: 1, b: 'test' });
      const key2 = service.getCacheKey('test-operation', { b: 'test', a: 1 });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different operations', () => {
      const key1 = service.getCacheKey('operation-1', { a: 1 });
      const key2 = service.getCacheKey('operation-2', { a: 1 });

      expect(key1).not.toBe(key2);
    });
  });

  describe('shouldInvalidateCache', () => {
    const strategy = CacheStrategy.create('test-key', 30, 100, 'LRU');

    it('should return false when cachedAt is undefined', () => {
      expect(service.shouldInvalidateCache('test-key', strategy)).toBe(false);
    });

    it('should return false when TTL has not expired', () => {
      const cachedAt = new Date();
      expect(service.shouldInvalidateCache('test-key', strategy, cachedAt)).toBe(false);
    });

    it('should return true when TTL has expired', () => {
      const cachedAt = new Date(Date.now() - 31000); // 31 seconds ago
      expect(service.shouldInvalidateCache('test-key', strategy, cachedAt)).toBe(true);
    });
  });

  describe('createCacheHitEvent', () => {
    it('should create a valid CacheHit event', () => {
      const event = service.createCacheHitEvent('test-key');

      expect(event.eventId).toBeDefined();
      expect(event.cacheKey).toBe('test-key');
      expect(event.hitAt).toBeInstanceOf(Date);
    });
  });

  describe('createCacheMissEvent', () => {
    it('should create a valid CacheMiss event', () => {
      const event = service.createCacheMissEvent('test-key');

      expect(event.eventId).toBeDefined();
      expect(event.cacheKey).toBe('test-key');
      expect(event.missedAt).toBeInstanceOf(Date);
    });
  });
});
