import { PerformanceMonitoringService } from '../../../src/domain/services/performance-monitoring-service';
import { PerformanceMetric } from '../../../src/domain/value-objects/performance-metric';
import { PerformanceThreshold } from '../../../src/domain/value-objects/performance-threshold';
import { PerformanceProfile } from '../../../src/domain/value-objects/performance-profile';

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    service = new PerformanceMonitoringService();
  });

  describe('checkThreshold', () => {
    it('should return false when metric is below threshold', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        400,
        40,
        4,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      expect(service.checkThreshold(metric, threshold)).toBe(false);
    });

    it('should return true when executionTime exceeds threshold', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        600,
        40,
        4,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      expect(service.checkThreshold(metric, threshold)).toBe(true);
    });

    it('should return true when memoryUsage exceeds threshold', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        400,
        60,
        4,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      expect(service.checkThreshold(metric, threshold)).toBe(true);
    });

    it('should return true when cpuUsage exceeds threshold', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        400,
        40,
        10,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      expect(service.checkThreshold(metric, threshold)).toBe(true);
    });

    it('should return false when operationName does not match', () => {
      const metric = PerformanceMetric.create(
        'other-operation',
        600,
        60,
        10,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      expect(service.checkThreshold(metric, threshold)).toBe(false);
    });
  });

  describe('createThresholdExceededEvent', () => {
    it('should create a valid PerformanceThresholdExceeded event', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        600,
        40,
        4,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      const event = service.createThresholdExceededEvent(metric, threshold);

      expect(event.eventId).toBeDefined();
      expect(event.operationName).toBe('test-operation');
      expect(event.metric).toBe(metric);
      expect(event.threshold).toBe(threshold);
      expect(event.exceededBy).toBe(20); // (600 - 500) / 500 * 100 = 20%
    });

    it('should calculate exceededBy based on max exceeded value', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        600,
        75,
        4,
        new Date()
      );
      const threshold = PerformanceThreshold.create('test-operation', 500, 50, 5);

      const event = service.createThresholdExceededEvent(metric, threshold);

      // memoryUsage exceeded by (75 - 50) / 50 * 100 = 50%
      // executionTime exceeded by (600 - 500) / 500 * 100 = 20%
      // Should return max: 50%
      expect(event.exceededBy).toBe(50);
    });
  });

  describe('updateProfile', () => {
    it('should create a new profile when existingProfile is null', () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        new Date()
      );

      const profile = service.updateProfile(null, metric);

      expect(profile.operationName).toBe('test-operation');
      expect(profile.averageExecutionTimeMs).toBe(100);
      expect(profile.sampleCount).toBe(1);
    });

    it('should update existing profile with new metric', () => {
      const existingProfile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        new Date()
      );
      const newMetric = PerformanceMetric.create(
        'test-operation',
        200,
        20,
        10,
        new Date()
      );

      const updatedProfile = service.updateProfile(existingProfile, newMetric);

      expect(updatedProfile.sampleCount).toBe(11);
      // New average: (100 * 10 + 200) / 11 = 109.09...
      expect(updatedProfile.averageExecutionTimeMs).toBeCloseTo(109.09, 1);
    });
  });
});
