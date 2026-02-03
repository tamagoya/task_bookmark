import { PerformanceThreshold } from '../../../src/domain/value-objects/performance-threshold';

describe('PerformanceThreshold', () => {
  describe('create', () => {
    it('should create a valid PerformanceThreshold', () => {
      const threshold = PerformanceThreshold.create(
        'test-operation',
        500,
        50,
        5
      );

      expect(threshold.operationName).toBe('test-operation');
      expect(threshold.maxExecutionTimeMs).toBe(500);
      expect(threshold.maxMemoryUsageMB).toBe(50);
      expect(threshold.maxCpuUsagePercent).toBe(5);
    });

    it('should throw error if operationName is empty', () => {
      expect(() => {
        PerformanceThreshold.create('', 500, 50, 5);
      }).toThrow('Operation name cannot be empty');
    });

    it('should throw error if maxExecutionTimeMs is not positive', () => {
      expect(() => {
        PerformanceThreshold.create('test-operation', 0, 50, 5);
      }).toThrow('Max execution time must be positive');
    });

    it('should throw error if maxMemoryUsageMB is not positive', () => {
      expect(() => {
        PerformanceThreshold.create('test-operation', 500, 0, 5);
      }).toThrow('Max memory usage must be positive');
    });

    it('should throw error if maxCpuUsagePercent is not positive', () => {
      expect(() => {
        PerformanceThreshold.create('test-operation', 500, 50, 0);
      }).toThrow('Max CPU usage must be between 1 and 100');
    });

    it('should throw error if maxCpuUsagePercent is greater than 100', () => {
      expect(() => {
        PerformanceThreshold.create('test-operation', 500, 50, 101);
      }).toThrow('Max CPU usage must be between 1 and 100');
    });

    it('should accept maxCpuUsagePercent of 100', () => {
      const threshold = PerformanceThreshold.create(
        'test-operation',
        500,
        50,
        100
      );
      expect(threshold.maxCpuUsagePercent).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for equal PerformanceThresholds', () => {
      const threshold1 = PerformanceThreshold.create(
        'test-operation',
        500,
        50,
        5
      );
      const threshold2 = PerformanceThreshold.create(
        'test-operation',
        500,
        50,
        5
      );

      expect(threshold1.equals(threshold2)).toBe(true);
    });

    it('should return false for different PerformanceThresholds', () => {
      const threshold1 = PerformanceThreshold.create(
        'test-operation',
        500,
        50,
        5
      );
      const threshold2 = PerformanceThreshold.create(
        'test-operation',
        1000,
        50,
        5
      );

      expect(threshold1.equals(threshold2)).toBe(false);
    });
  });
});
