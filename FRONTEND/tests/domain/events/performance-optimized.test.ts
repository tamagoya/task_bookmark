import { PerformanceOptimized } from '../../../src/domain/events/performance-optimized';
import { PerformanceMetric } from '../../../src/domain/value-objects/performance-metric';

describe('PerformanceOptimized', () => {
  const beforeMetric = PerformanceMetric.create(
    'test-operation',
    200,
    20,
    10,
    new Date()
  );
  const afterMetric = PerformanceMetric.create(
    'test-operation',
    100,
    10,
    5,
    new Date()
  );

  describe('create', () => {
    it('should create a valid PerformanceOptimized event', () => {
      const event = PerformanceOptimized.create(
        beforeMetric,
        afterMetric,
        50
      );

      expect(event.eventId).toBeDefined();
      expect(event.operationName).toBe('test-operation');
      expect(event.beforeMetric).toBe(beforeMetric);
      expect(event.afterMetric).toBe(afterMetric);
      expect(event.improvementPercent).toBe(50);
      expect(event.optimizedAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = PerformanceOptimized.create(beforeMetric, afterMetric, 50);
      const event2 = PerformanceOptimized.create(beforeMetric, afterMetric, 50);

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
