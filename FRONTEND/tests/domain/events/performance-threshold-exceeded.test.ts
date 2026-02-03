import { PerformanceThresholdExceeded } from '../../../src/domain/events/performance-threshold-exceeded';
import { PerformanceMetric } from '../../../src/domain/value-objects/performance-metric';
import { PerformanceThreshold } from '../../../src/domain/value-objects/performance-threshold';

describe('PerformanceThresholdExceeded', () => {
  const metric = PerformanceMetric.create(
    'test-operation',
    600,
    10,
    5,
    new Date()
  );
  const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

  describe('create', () => {
    it('should create a valid PerformanceThresholdExceeded event', () => {
      const event = PerformanceThresholdExceeded.create(metric, threshold, 20);

      expect(event.eventId).toBeDefined();
      expect(event.operationName).toBe('test-operation');
      expect(event.metric).toBe(metric);
      expect(event.threshold).toBe(threshold);
      expect(event.exceededBy).toBe(20);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = PerformanceThresholdExceeded.create(metric, threshold, 20);
      const event2 = PerformanceThresholdExceeded.create(metric, threshold, 20);

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
