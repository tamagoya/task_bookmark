import { PerformanceInterceptor } from '../../../src/application/decorators/performance-interceptor';
import { PerformanceMonitoringService } from '../../../src/domain/services/performance-monitoring-service';
import { InMemoryPerformanceMetricsRepository } from '../../../src/infrastructure/repositories/in-memory-performance-metrics-repository';
import { PerformanceMetricsCollector } from '../../../src/infrastructure/adapters/performance-metrics-collector';
import { Logger } from '../../../src/infrastructure/adapters/logger';

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let metricsRepository: InMemoryPerformanceMetricsRepository;

  beforeEach(() => {
    const monitoringService = new PerformanceMonitoringService();
    metricsRepository = new InMemoryPerformanceMetricsRepository();
    const metricsCollector = new PerformanceMetricsCollector();
    const logger = new Logger();

    interceptor = new PerformanceInterceptor(
      monitoringService,
      metricsRepository,
      metricsCollector,
      logger
    );
  });

  describe('intercept', () => {
    it('should execute operation and return result', async () => {
      const operation = async () => 'test-result';

      const result = await interceptor.intercept('test-operation', operation);

      expect(result).toBe('test-result');
    });

    it('should record metrics after operation', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'test-result';
      };

      await interceptor.intercept('test-operation', operation);

      // メトリクスが記録されるまで少し待機
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = await metricsRepository.findByOperationName(
        'test-operation',
        10
      );

      expect(metrics.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle operation error', async () => {
      const operation = async () => {
        throw new Error('Test error');
      };

      await expect(
        interceptor.intercept('test-operation', operation)
      ).rejects.toThrow('Test error');
    });
  });
});
