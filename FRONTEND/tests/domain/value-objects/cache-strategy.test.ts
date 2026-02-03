import { CacheStrategy } from '../../../src/domain/value-objects/cache-strategy';

describe('CacheStrategy', () => {
  describe('create', () => {
    it('should create a valid CacheStrategy', () => {
      const strategy = CacheStrategy.create('test-key', 30, 100, 'LRU');

      expect(strategy.cacheKey).toBe('test-key');
      expect(strategy.ttlSeconds).toBe(30);
      expect(strategy.maxSize).toBe(100);
      expect(strategy.evictionPolicy).toBe('LRU');
    });

    it('should accept FIFO eviction policy', () => {
      const strategy = CacheStrategy.create('test-key', 30, 100, 'FIFO');
      expect(strategy.evictionPolicy).toBe('FIFO');
    });

    it('should accept LFU eviction policy', () => {
      const strategy = CacheStrategy.create('test-key', 30, 100, 'LFU');
      expect(strategy.evictionPolicy).toBe('LFU');
    });

    it('should throw error if cacheKey is empty', () => {
      expect(() => {
        CacheStrategy.create('', 30, 100, 'LRU');
      }).toThrow('Cache key cannot be empty');
    });

    it('should throw error if ttlSeconds is not positive', () => {
      expect(() => {
        CacheStrategy.create('test-key', 0, 100, 'LRU');
      }).toThrow('TTL must be positive');
    });

    it('should throw error if maxSize is not positive', () => {
      expect(() => {
        CacheStrategy.create('test-key', 30, 0, 'LRU');
      }).toThrow('Max size must be positive');
    });
  });

  describe('equals', () => {
    it('should return true for equal CacheStrategies', () => {
      const strategy1 = CacheStrategy.create('test-key', 30, 100, 'LRU');
      const strategy2 = CacheStrategy.create('test-key', 30, 100, 'LRU');

      expect(strategy1.equals(strategy2)).toBe(true);
    });

    it('should return false for different CacheStrategies', () => {
      const strategy1 = CacheStrategy.create('test-key', 30, 100, 'LRU');
      const strategy2 = CacheStrategy.create('test-key', 60, 100, 'LRU');

      expect(strategy1.equals(strategy2)).toBe(false);
    });
  });
});
