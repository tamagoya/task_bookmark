import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { PerformanceMonitoringService } from '../../domain/services/performance-monitoring-service';
import { PerformanceOptimizationService } from '../../domain/services/performance-optimization-service';
import { CacheManagementService } from '../../domain/services/cache-management-service';
import { InMemoryPerformanceMetricsRepository } from '../../infrastructure/repositories/in-memory-performance-metrics-repository';
import { InMemoryCacheRepository } from '../../infrastructure/repositories/in-memory-cache-repository';
import { PerformanceMetricsCollector } from '../../infrastructure/adapters/performance-metrics-collector';
import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../infrastructure/adapters/logger';
import { EventHandler } from '../handlers/event-handler';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';
import { CacheDecorator } from '../decorators/cache-decorator';
import { OptimizedCalendarEventService } from '../services/optimized-calendar-event-service';
import { OptimizedTabCaptureService } from '../services/optimized-tab-capture-service';
import { OptimizedRestoreService } from '../services/optimized-restore-service';
import { OptimizedTabRestoreManager } from '../services/optimized-tab-restore-manager';
import { CalendarEventService } from '../services/calendar-event-service';

/**
 * OptimizedServiceFactory
 * パフォーマンス最適化されたサービスのインスタンスを作成するファクトリ
 */
export class OptimizedServiceFactory {
  private readonly logger: Logger;
  private readonly performanceInterceptor: PerformanceInterceptor;
  private readonly cacheDecorator: CacheDecorator;
  private readonly performanceOptimizationService: PerformanceOptimizationService;

  constructor() {
    this.logger = new Logger();

    // Domain Services
    const performanceMonitoringService = new PerformanceMonitoringService();
    this.performanceOptimizationService = new PerformanceOptimizationService();
    const cacheManagementService = new CacheManagementService();

    // Infrastructure
    const metricsRepository = new InMemoryPerformanceMetricsRepository();
    const cacheRepository = new InMemoryCacheRepository();
    const metricsCollector = new PerformanceMetricsCollector();

    // Decorators
    this.performanceInterceptor = new PerformanceInterceptor(
      performanceMonitoringService,
      metricsRepository,
      metricsCollector,
      this.logger
    );

    this.cacheDecorator = new CacheDecorator(
      cacheManagementService,
      cacheRepository,
      this.logger
    );
  }

  /**
   * 最適化されたCalendarEventServiceを作成
   */
  createOptimizedCalendarEventService(
    calendarEventRepository: CalendarEventRepository,
    eventHandler: EventHandler
  ): OptimizedCalendarEventService {
    return new OptimizedCalendarEventService(
      calendarEventRepository,
      eventHandler,
      this.performanceInterceptor,
      this.cacheDecorator
    );
  }

  /**
   * 最適化されたTabCaptureServiceを作成
   */
  createOptimizedTabCaptureService(
    tabsAdapter: ChromeTabsAdapter,
    windowsAdapter: ChromeWindowsAdapter,
    eventHandler: EventHandler
  ): OptimizedTabCaptureService {
    return new OptimizedTabCaptureService(
      tabsAdapter,
      windowsAdapter,
      this.logger,
      eventHandler,
      this.performanceInterceptor,
      this.cacheDecorator
    );
  }

  /**
   * 最適化されたRestoreServiceを作成
   */
  createOptimizedRestoreService(
    chromeWindowsAdapter: ChromeWindowsAdapter,
    chromeTabsAdapter: ChromeTabsAdapter,
    calendarEventService: CalendarEventService,
    tabRestoreManager: OptimizedTabRestoreManager
  ): OptimizedRestoreService {
    return new OptimizedRestoreService(
      chromeWindowsAdapter,
      chromeTabsAdapter,
      calendarEventService,
      tabRestoreManager,
      this.logger,
      this.performanceInterceptor
    );
  }

  /**
   * 最適化されたTabRestoreManagerを作成
   */
  createOptimizedTabRestoreManager(
    chromeTabsAdapter: ChromeTabsAdapter
  ): OptimizedTabRestoreManager {
    return new OptimizedTabRestoreManager(
      chromeTabsAdapter,
      this.logger,
      this.performanceInterceptor,
      this.performanceOptimizationService
    );
  }

  /**
   * PerformanceInterceptorを取得
   */
  getPerformanceInterceptor(): PerformanceInterceptor {
    return this.performanceInterceptor;
  }

  /**
   * CacheDecoratorを取得
   */
  getCacheDecorator(): CacheDecorator {
    return this.cacheDecorator;
  }

  /**
   * Loggerを取得
   */
  getLogger(): Logger {
    return this.logger;
  }
}
