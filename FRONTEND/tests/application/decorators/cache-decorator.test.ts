import { CacheDecorator } from '../../../src/application/decorators/cache-decorator';
import { CacheManagementService } from '../../../src/domain/services/cache-management-service';
import { InMemoryCacheRepository } from '../../../src/infrastructure/repositories/in-memory-cache-repository';
import { CacheStrategy } from '../../../src/domain/value-objects/cache-strategy';
import { Logger } from '../../../src/infrastructure/adapters/logger';

describe('CacheDecorator', () => {
  let decorator: CacheDecorator;
  let cacheRepository: InMemoryCacheRepository;

  beforeEach(() => {
    const cacheService = new CacheManagementService();
    cacheRepository = new InMemoryCacheRepository();
    const logger = new Logger();

    decorator = new CacheDecorator(cacheService, cacheRepository, logger);
  });

  describe('withCache', () => {
    const strategy = CacheStrategy.create('test-key', 60, 100, 'LRU');

    it('should execute operation on cache miss', async () => {
      let operationCalled = false;
      const operation = async () => {
        operationCalled = true;
        return 'test-result';
      };

      const result = await decorator.withCache(
        'test-operation',
        { param: 'value' },
        operation,
        strategy
      );

      expect(result).toBe('test-result');
      expect(operationCalled).toBe(true);
    });

    it('should return cached value on cache hit', async () => {
      let operationCallCount = 0;
      const operation = async () => {
        operationCallCount++;
        return 'test-result';
      };

      // First call: cache miss
      await decorator.withCache(
        'test-operation',
        { param: 'value' },
        operation,
        strategy
      );

      // Second call: cache hit
      const result = await decorator.withCache(
        'test-operation',
        { param: 'value' },
        operation,
        strategy
      );

      expect(result).toBe('test-result');
      expect(operationCallCount).toBe(1); // Operation called only once
    });
  });

  describe('invalidate', () => {
    it('should invalidate cached value', async () => {
      const strategy = CacheStrategy.create('test-key', 60, 100, 'LRU');

      // Cache a value
      await decorator.withCache(
        'test-operation',
        { param: 'value' },
        async () => 'test-result',
        strategy
      );

      // Invalidate
      await decorator.invalidate('test-operation', { param: 'value' });

      // Check cache is empty
      let operationCalled = false;
      await decorator.withCache(
        'test-operation',
        { param: 'value' },
        async () => {
          operationCalled = true;
          return 'new-result';
        },
        strategy
      );

      expect(operationCalled).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all cached values', async () => {
      const strategy = CacheStrategy.create('test-key', 60, 100, 'LRU');

      // Cache values
      await decorator.withCache(
        'test-operation-1',
        { param: 'value1' },
        async () => 'result1',
        strategy
      );
      await decorator.withCache(
        'test-operation-2',
        { param: 'value2' },
        async () => 'result2',
        strategy
      );

      // Clear all
      await decorator.clearAll();

      // Check cache is empty
      const size = await cacheRepository.size();
      expect(size).toBe(0);
    });
  });
});
