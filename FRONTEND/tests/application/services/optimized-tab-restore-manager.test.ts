import { OptimizedTabRestoreManager } from '../../../src/application/services/optimized-tab-restore-manager';
import { TabRestoreManager } from '../../../src/application/services/tab-restore-manager';
import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { PerformanceInterceptor } from '../../../src/application/decorators/performance-interceptor';
import { PerformanceMonitoringService } from '../../../src/domain/services/performance-monitoring-service';
import { PerformanceOptimizationService } from '../../../src/domain/services/performance-optimization-service';
import { InMemoryPerformanceMetricsRepository } from '../../../src/infrastructure/repositories/in-memory-performance-metrics-repository';
import { PerformanceMetricsCollector } from '../../../src/infrastructure/adapters/performance-metrics-collector';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

// Mocks
jest.mock('../../../src/infrastructure/adapters/chrome-tabs-adapter');

describe('OptimizedTabRestoreManager', () => {
  let manager: OptimizedTabRestoreManager;
  let mockTabsAdapter: jest.Mocked<ChromeTabsAdapter>;
  let logger: Logger;
  let performanceInterceptor: PerformanceInterceptor;
  let optimizationService: PerformanceOptimizationService;

  beforeEach(() => {
    logger = new Logger();
    mockTabsAdapter = new ChromeTabsAdapter(logger) as jest.Mocked<ChromeTabsAdapter>;
    
    const monitoringService = new PerformanceMonitoringService();
    const metricsRepository = new InMemoryPerformanceMetricsRepository();
    const metricsCollector = new PerformanceMetricsCollector();
    
    performanceInterceptor = new PerformanceInterceptor(
      monitoringService,
      metricsRepository,
      metricsCollector,
      logger
    );
    
    optimizationService = new PerformanceOptimizationService();

    // ベースのTabRestoreManagerを作成
    const baseManager = new TabRestoreManager(mockTabsAdapter, logger);

    // 最適化されたマネージャーを作成
    manager = new OptimizedTabRestoreManager(
      baseManager,
      logger,
      performanceInterceptor,
      optimizationService
    );
  });

  describe('restoreTabsInOrder', () => {
    it('should return empty array for empty tabs', async () => {
      const result = await manager.restoreTabsInOrder([], 1);

      expect(result).toEqual([]);
    });

    it('should restore tabs without batching for small tab count', async () => {
      const tabs = [
        TabInfo.create({ url: 'https://example1.com', title: 'Example 1', index: 0 }),
        TabInfo.create({ url: 'https://example2.com', title: 'Example 2', index: 1 }),
      ];

      mockTabsAdapter.createTab
        .mockResolvedValueOnce({ id: 100, url: 'https://example1.com' } as chrome.tabs.Tab)
        .mockResolvedValueOnce({ id: 101, url: 'https://example2.com' } as chrome.tabs.Tab);

      const result = await manager.restoreTabsInOrder(tabs, 1);

      expect(result).toEqual([100, 101]);
      expect(mockTabsAdapter.createTab).toHaveBeenCalledTimes(2);
    });

    it('should call onProgress callback', async () => {
      const tabs = [
        TabInfo.create({ url: 'https://example1.com', title: 'Example 1', index: 0 }),
        TabInfo.create({ url: 'https://example2.com', title: 'Example 2', index: 1 }),
      ];

      mockTabsAdapter.createTab
        .mockResolvedValueOnce({ id: 100, url: 'https://example1.com' } as chrome.tabs.Tab)
        .mockResolvedValueOnce({ id: 101, url: 'https://example2.com' } as chrome.tabs.Tab);

      const onProgress = jest.fn();

      await manager.restoreTabsInOrder(tabs, 1, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it('should continue on tab restore failure', async () => {
      const tabs = [
        TabInfo.create({ url: 'https://example1.com', title: 'Example 1', index: 0 }),
        TabInfo.create({ url: 'https://example2.com', title: 'Example 2', index: 1 }),
        TabInfo.create({ url: 'https://example3.com', title: 'Example 3', index: 2 }),
      ];

      mockTabsAdapter.createTab
        .mockResolvedValueOnce({ id: 100, url: 'https://example1.com' } as chrome.tabs.Tab)
        .mockRejectedValueOnce(new Error('Tab creation failed'))
        .mockResolvedValueOnce({ id: 102, url: 'https://example3.com' } as chrome.tabs.Tab);

      const result = await manager.restoreTabsInOrder(tabs, 1);

      expect(result).toEqual([100, 102]); // Second tab is skipped
      expect(mockTabsAdapter.createTab).toHaveBeenCalledTimes(3);
    });
  });
});
