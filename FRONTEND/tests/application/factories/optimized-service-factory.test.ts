import { OptimizedServiceFactory } from '../../../src/application/factories/optimized-service-factory';
import { CalendarEventRepositoryImpl } from '../../../src/infrastructure/repositories/calendar-event-repository-impl';
import { EventHandler } from '../../../src/application/handlers/event-handler';
import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../../../src/infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { UIMessenger } from '../../../src/infrastructure/adapters/ui-messenger';

// Mocks
jest.mock('../../../src/infrastructure/repositories/calendar-event-repository-impl');
jest.mock('../../../src/application/handlers/event-handler');
jest.mock('../../../src/infrastructure/adapters/chrome-tabs-adapter');
jest.mock('../../../src/infrastructure/adapters/chrome-windows-adapter');

describe('OptimizedServiceFactory', () => {
  let factory: OptimizedServiceFactory;
  let logger: Logger;

  beforeEach(() => {
    factory = new OptimizedServiceFactory();
    logger = new Logger();
  });

  describe('constructor', () => {
    it('should create factory instance', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('createOptimizedCalendarEventService', () => {
    it('should create OptimizedCalendarEventService', () => {
      const mockRepository = new CalendarEventRepositoryImpl(
        {} as any,
        {} as any
      );
      const uiMessenger = new UIMessenger();
      const mockEventHandler = new EventHandler(uiMessenger, logger);

      const service = factory.createOptimizedCalendarEventService(
        mockRepository,
        mockEventHandler
      );

      expect(service).toBeDefined();
    });
  });

  describe('createOptimizedTabCaptureService', () => {
    it('should create OptimizedTabCaptureService', () => {
      const mockTabsAdapter = new ChromeTabsAdapter(logger);
      const mockWindowsAdapter = new ChromeWindowsAdapter(logger);
      const uiMessenger = new UIMessenger();
      const mockEventHandler = new EventHandler(uiMessenger, logger);

      const service = factory.createOptimizedTabCaptureService(
        mockTabsAdapter,
        mockWindowsAdapter,
        mockEventHandler
      );

      expect(service).toBeDefined();
    });
  });

  describe('createOptimizedTabRestoreManager', () => {
    it('should create OptimizedTabRestoreManager', () => {
      const mockTabsAdapter = new ChromeTabsAdapter(logger);

      const manager = factory.createOptimizedTabRestoreManager(mockTabsAdapter);

      expect(manager).toBeDefined();
    });
  });

  describe('getters', () => {
    it('should return PerformanceInterceptor', () => {
      expect(factory.getPerformanceInterceptor()).toBeDefined();
    });

    it('should return CacheDecorator', () => {
      expect(factory.getCacheDecorator()).toBeDefined();
    });

    it('should return Logger', () => {
      expect(factory.getLogger()).toBeDefined();
    });
  });
});
