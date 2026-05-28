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
import { TabCaptureService } from '../services/tab-capture-service';
import { RestoreService } from '../services/restore-service';
import { TabRestoreManager } from '../services/tab-restore-manager';
import { IgnoreRulesService } from '../services/ignore-rules-service';

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
   * ベースのCalendarEventServiceをラップしてパフォーマンス監視とキャッシュを追加
   */
  createOptimizedCalendarEventService(
    calendarEventRepository: CalendarEventRepository,
    eventHandler: EventHandler
  ): OptimizedCalendarEventService {
    // ベースサービスを作成
    const baseService = new CalendarEventService(
      calendarEventRepository,
      eventHandler
    );

    // ベースサービスをラップして最適化機能を追加
    return new OptimizedCalendarEventService(
      baseService,
      this.performanceInterceptor,
      this.cacheDecorator
    );
  }

  /**
   * 最適化されたTabCaptureServiceを作成
   * ベースのTabCaptureServiceをラップしてパフォーマンス監視とキャッシュを追加
   */
  createOptimizedTabCaptureService(
    tabsAdapter: ChromeTabsAdapter,
    windowsAdapter: ChromeWindowsAdapter,
    eventHandler: EventHandler
  ): OptimizedTabCaptureService {
    // ベースサービスを作成
    const baseService = new TabCaptureService(
      tabsAdapter,
      windowsAdapter,
      this.logger,
      eventHandler
    );

    // ベースサービスをラップして最適化機能を追加
    return new OptimizedTabCaptureService(
      baseService,
      windowsAdapter,
      this.performanceInterceptor,
      this.cacheDecorator
    );
  }

  /**
   * 最適化されたRestoreServiceを作成
   * ベースのRestoreServiceをラップしてパフォーマンス監視を追加
   * Unit-7: ignoreRulesService を渡すと復元時に無視URLをフィルタする
   */
  createOptimizedRestoreService(
    chromeWindowsAdapter: ChromeWindowsAdapter,
    chromeTabsAdapter: ChromeTabsAdapter,
    calendarEventService: CalendarEventService,
    _optimizedTabRestoreManager: OptimizedTabRestoreManager,
    ignoreRulesService?: IgnoreRulesService
  ): OptimizedRestoreService {
    // 将来の拡張用に保持（現在はbaseServiceが独自のTabRestoreManagerを使用）
    void _optimizedTabRestoreManager;

    // TabRestoreManagerを作成（OptimizedTabRestoreManagerの内部で使用）
    const baseTabRestoreManager = new TabRestoreManager(
      chromeTabsAdapter,
      this.logger
    );

    // ベースのRestoreServiceを作成
    const baseService = new RestoreService(
      chromeWindowsAdapter,
      chromeTabsAdapter,
      calendarEventService,
      baseTabRestoreManager,
      this.logger,
      ignoreRulesService
    );

    // ベースサービスをラップして最適化機能を追加
    return new OptimizedRestoreService(
      baseService,
      this.performanceInterceptor
    );
  }

  /**
   * 最適化されたTabRestoreManagerを作成
   * ベースのTabRestoreManagerをラップしてパフォーマンス監視とバッチ最適化を追加
   */
  createOptimizedTabRestoreManager(
    chromeTabsAdapter: ChromeTabsAdapter
  ): OptimizedTabRestoreManager {
    // ベースのTabRestoreManagerを作成
    const baseManager = new TabRestoreManager(
      chromeTabsAdapter,
      this.logger
    );

    // ベースマネージャーをラップして最適化機能を追加
    return new OptimizedTabRestoreManager(
      baseManager,
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
