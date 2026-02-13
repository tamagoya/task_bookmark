import { PerformanceMetricsCollector } from '../../../src/infrastructure/adapters/performance-metrics-collector';

describe('PerformanceMetricsCollector', () => {
  let collector: PerformanceMetricsCollector;

  beforeEach(() => {
    collector = new PerformanceMetricsCollector();
  });

  describe('getMemoryUsage', () => {
    it('should return non-negative value', () => {
      const memoryUsage = collector.getMemoryUsage();

      expect(memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCpuUsage', () => {
    it('should return 0 (not available in Chrome Extension)', () => {
      const cpuUsage = collector.getCpuUsage();

      expect(cpuUsage).toBe(0);
    });
  });

  describe('now', () => {
    it('should return timestamp', () => {
      const timestamp = collector.now();

      expect(timestamp).toBeGreaterThan(0);
    });
  });
});
