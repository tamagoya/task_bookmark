import { PerformanceOptimizationService } from '../../../src/domain/services/performance-optimization-service';
import { PerformanceProfile } from '../../../src/domain/value-objects/performance-profile';

describe('PerformanceOptimizationService', () => {
  let service: PerformanceOptimizationService;

  beforeEach(() => {
    service = new PerformanceOptimizationService();
  });

  describe('optimizeCacheStrategy', () => {
    it('should return default cache strategy when profile is null', () => {
      const strategy = service.optimizeCacheStrategy('test-operation', null);

      expect(strategy.cacheKey).toBe('test-operation');
      expect(strategy.ttlSeconds).toBe(30);
      expect(strategy.maxSize).toBe(100);
      expect(strategy.evictionPolicy).toBe('LRU');
    });

    it('should return longer TTL for slow operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        1500, // > 1000ms
        1400,
        1600,
        1800,
        50,
        new Date()
      );

      const strategy = service.optimizeCacheStrategy('test-operation', profile);

      expect(strategy.ttlSeconds).toBe(60);
    });

    it('should return medium TTL for medium operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        700, // > 500ms, < 1000ms
        600,
        800,
        900,
        50,
        new Date()
      );

      const strategy = service.optimizeCacheStrategy('test-operation', profile);

      expect(strategy.ttlSeconds).toBe(30);
    });

    it('should return short TTL for fast operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100, // < 500ms
        90,
        150,
        200,
        50,
        new Date()
      );

      const strategy = service.optimizeCacheStrategy('test-operation', profile);

      expect(strategy.ttlSeconds).toBe(5);
    });

    it('should increase maxSize for high-frequency operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        150, // > 100 samples
        new Date()
      );

      const strategy = service.optimizeCacheStrategy('test-operation', profile);

      expect(strategy.maxSize).toBe(200);
    });
  });

  describe('optimizeBatchSize', () => {
    it('should return current batch size when profile is null', () => {
      const batchSize = service.optimizeBatchSize('test-operation', 5, null);

      expect(batchSize.operationName).toBe('test-operation');
      expect(batchSize.size).toBe(5);
      expect(batchSize.delayMs).toBe(100);
    });

    it('should reduce batch size for very slow operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        2500, // > 2000ms
        2400,
        2600,
        2800,
        50,
        new Date()
      );

      const batchSize = service.optimizeBatchSize('test-operation', 5, profile);

      expect(batchSize.size).toBe(3); // 5 - 2
      expect(batchSize.delayMs).toBe(200);
    });

    it('should slightly reduce batch size for slow operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        1500, // > 1000ms, < 2000ms
        1400,
        1600,
        1800,
        50,
        new Date()
      );

      const batchSize = service.optimizeBatchSize('test-operation', 5, profile);

      expect(batchSize.size).toBe(4); // 5 - 1
      expect(batchSize.delayMs).toBe(150);
    });

    it('should not reduce batch size below 1', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        2500,
        2400,
        2600,
        2800,
        50,
        new Date()
      );

      const batchSize = service.optimizeBatchSize('test-operation', 1, profile);

      expect(batchSize.size).toBe(1);
    });
  });

  describe('shouldUseCache', () => {
    it('should return true when profile is null', () => {
      expect(service.shouldUseCache('test-operation', null)).toBe(true);
    });

    it('should return false when sample count is low', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        5, // < 10 samples
        new Date()
      );

      expect(service.shouldUseCache('test-operation', profile)).toBe(false);
    });

    it('should return false when operation is very fast', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        30, // < 50ms
        25,
        40,
        45,
        50,
        new Date()
      );

      expect(service.shouldUseCache('test-operation', profile)).toBe(false);
    });

    it('should return true for normal operations', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100, // >= 50ms
        90,
        150,
        200,
        50, // >= 10 samples
        new Date()
      );

      expect(service.shouldUseCache('test-operation', profile)).toBe(true);
    });
  });
});
