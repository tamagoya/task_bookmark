import { PerformanceMetric } from '../../../src/domain/value-objects/performance-metric';

describe('PerformanceMetric', () => {
  describe('create', () => {
    it('should create a valid PerformanceMetric', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        new Date()
      );

      expect(metric.operationName).toBe('test-operation');
      expect(metric.executionTimeMs).toBe(100);
      expect(metric.memoryUsageMB).toBe(10);
      expect(metric.cpuUsagePercent).toBe(5);
      expect(metric.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error if operationName is empty', () => {
      expect(() => {
        PerformanceMetric.create('', 100, 10, 5, new Date());
      }).toThrow('Operation name cannot be empty');
    });

    it('should throw error if executionTimeMs is negative', () => {
      expect(() => {
        PerformanceMetric.create('test-operation', -1, 10, 5, new Date());
      }).toThrow('Execution time must be non-negative');
    });

    it('should throw error if memoryUsageMB is negative', () => {
      expect(() => {
        PerformanceMetric.create('test-operation', 100, -1, 5, new Date());
      }).toThrow('Memory usage must be non-negative');
    });

    it('should throw error if cpuUsagePercent is negative', () => {
      expect(() => {
        PerformanceMetric.create('test-operation', 100, 10, -1, new Date());
      }).toThrow('CPU usage must be between 0 and 100');
    });

    it('should throw error if cpuUsagePercent is greater than 100', () => {
      expect(() => {
        PerformanceMetric.create('test-operation', 100, 10, 101, new Date());
      }).toThrow('CPU usage must be between 0 and 100');
    });

    it('should accept cpuUsagePercent of 0', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        0,
        new Date()
      );
      expect(metric.cpuUsagePercent).toBe(0);
    });

    it('should accept cpuUsagePercent of 100', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        100,
        new Date()
      );
      expect(metric.cpuUsagePercent).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for equal PerformanceMetrics', () => {
      const timestamp = new Date();
      const metric1 = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        timestamp
      );
      const metric2 = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        timestamp
      );

      expect(metric1.equals(metric2)).toBe(true);
    });

    it('should return false for different PerformanceMetrics', () => {
      const timestamp = new Date();
      const metric1 = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        timestamp
      );
      const metric2 = PerformanceMetric.create(
        'test-operation',
        200,
        10,
        5,
        timestamp
      );

      expect(metric1.equals(metric2)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        new Date()
      );

      expect(metric.equals(null as unknown as PerformanceMetric)).toBe(false);
    });
  });
});
