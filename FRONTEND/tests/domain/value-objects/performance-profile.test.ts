import { PerformanceProfile } from '../../../src/domain/value-objects/performance-profile';

describe('PerformanceProfile', () => {
  describe('create', () => {
    it('should create a valid PerformanceProfile', () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        new Date()
      );

      expect(profile.operationName).toBe('test-operation');
      expect(profile.averageExecutionTimeMs).toBe(100);
      expect(profile.p50ExecutionTimeMs).toBe(90);
      expect(profile.p95ExecutionTimeMs).toBe(150);
      expect(profile.p99ExecutionTimeMs).toBe(200);
      expect(profile.sampleCount).toBe(10);
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });

    it('should throw error if operationName is empty', () => {
      expect(() => {
        PerformanceProfile.create('', 100, 90, 150, 200, 10, new Date());
      }).toThrow('Operation name cannot be empty');
    });

    it('should throw error if averageExecutionTimeMs is negative', () => {
      expect(() => {
        PerformanceProfile.create(
          'test-operation',
          -1,
          90,
          150,
          200,
          10,
          new Date()
        );
      }).toThrow('Average execution time must be non-negative');
    });

    it('should throw error if sampleCount is not positive', () => {
      expect(() => {
        PerformanceProfile.create(
          'test-operation',
          100,
          90,
          150,
          200,
          0,
          new Date()
        );
      }).toThrow('Sample count must be positive');
    });
  });

  describe('equals', () => {
    it('should return true for equal PerformanceProfiles', () => {
      const timestamp = new Date();
      const profile1 = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        timestamp
      );
      const profile2 = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        timestamp
      );

      expect(profile1.equals(profile2)).toBe(true);
    });

    it('should return false for different PerformanceProfiles', () => {
      const timestamp = new Date();
      const profile1 = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        timestamp
      );
      const profile2 = PerformanceProfile.create(
        'test-operation',
        200,
        90,
        150,
        200,
        10,
        timestamp
      );

      expect(profile1.equals(profile2)).toBe(false);
    });
  });
});
