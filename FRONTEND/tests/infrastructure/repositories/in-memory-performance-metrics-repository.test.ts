import { InMemoryPerformanceMetricsRepository } from '../../../src/infrastructure/repositories/in-memory-performance-metrics-repository';
import { PerformanceMetric } from '../../../src/domain/value-objects/performance-metric';
import { PerformanceProfile } from '../../../src/domain/value-objects/performance-profile';

describe('InMemoryPerformanceMetricsRepository', () => {
  let repository: InMemoryPerformanceMetricsRepository;

  beforeEach(() => {
    repository = new InMemoryPerformanceMetricsRepository();
  });

  describe('save and findByOperationName', () => {
    it('should save and retrieve metrics', async () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        new Date()
      );

      await repository.save(metric);
      const metrics = await repository.findByOperationName('test-operation', 10);

      expect(metrics).toHaveLength(1);
      expect(metrics[0].operationName).toBe('test-operation');
    });

    it('should retrieve metrics with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const metric = PerformanceMetric.create(
          'test-operation',
          100 + i,
          10,
          5,
          new Date()
        );
        await repository.save(metric);
      }

      const metrics = await repository.findByOperationName('test-operation', 3);

      expect(metrics).toHaveLength(3);
    });

    it('should return empty array for unknown operation', async () => {
      const metrics = await repository.findByOperationName('unknown', 10);

      expect(metrics).toHaveLength(0);
    });
  });

  describe('getProfile and saveProfile', () => {
    it('should save and retrieve profile', async () => {
      const profile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        new Date()
      );

      await repository.saveProfile(profile);
      const retrieved = await repository.getProfile('test-operation');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.operationName).toBe('test-operation');
    });

    it('should return null for unknown operation', async () => {
      const profile = await repository.getProfile('unknown');

      expect(profile).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all metrics and profiles', async () => {
      const metric = PerformanceMetric.create(
        'test-operation',
        100,
        10,
        5,
        new Date()
      );
      const profile = PerformanceProfile.create(
        'test-operation',
        100,
        90,
        150,
        200,
        10,
        new Date()
      );

      await repository.save(metric);
      await repository.saveProfile(profile);

      repository.clear();

      const metrics = await repository.findByOperationName('test-operation', 10);
      const retrievedProfile = await repository.getProfile('test-operation');

      expect(metrics).toHaveLength(0);
      expect(retrievedProfile).toBeNull();
    });
  });
});
