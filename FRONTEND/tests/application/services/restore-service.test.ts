import { RestoreService } from '../../../src/application/services/restore-service';
import { ChromeWindowsAdapter } from '../../../src/infrastructure/adapters/chrome-windows-adapter';
import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { CalendarEventService } from '../../../src/application/services/calendar-event-service';
import { TabRestoreManager } from '../../../src/application/services/tab-restore-manager';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('RestoreService', () => {
  let service: RestoreService;
  let windowsAdapter: jest.Mocked<ChromeWindowsAdapter>;
  let tabsAdapter: jest.Mocked<ChromeTabsAdapter>;
  let calendarEventService: jest.Mocked<CalendarEventService>;
  let tabRestoreManager: jest.Mocked<TabRestoreManager>;
  let logger: jest.Mocked<Logger>;

  const eventId = EventId.create('event-id-12345');
  const calendarId = CalendarId.create('calendar-id-12345');
  const accessToken = AccessToken.create('valid-access-token-12345');
  const tabs: TabInfo[] = [
    TabInfo.create({ url: 'https://example.com', title: 'Example', index: 0 }),
    TabInfo.create({ url: 'https://example.org', title: 'Example Org', index: 1 }),
  ];

  beforeEach(() => {
    windowsAdapter = {
      createWindow: jest.fn(),
    } as unknown as jest.Mocked<ChromeWindowsAdapter>;

    tabsAdapter = {} as unknown as jest.Mocked<ChromeTabsAdapter>;

    calendarEventService = {
      findById: jest.fn(),
      recordRestore: jest.fn(),
    } as unknown as jest.Mocked<CalendarEventService>;

    tabRestoreManager = {
      restoreTabsInOrder: jest.fn(),
    } as unknown as jest.Mocked<TabRestoreManager>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    service = new RestoreService(
      windowsAdapter,
      tabsAdapter,
      calendarEventService,
      tabRestoreManager,
      logger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('restoreWorkState', () => {
    it('should restore work state successfully', async () => {
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );

      // 最初のタブが含まれたウィンドウ
      const window = {
        id: 12345,
        focused: true,
        type: 'normal',
        state: 'normal',
        tabs: [{ id: 100 }],
      } as unknown as chrome.windows.Window;

      // 残りのタブのID（最初のタブはウィンドウ作成時に作成される）
      const remainingTabIds = [101];

      calendarEventService.findById.mockResolvedValue(workState);
      windowsAdapter.createWindow.mockResolvedValue(window);
      tabRestoreManager.restoreTabsInOrder.mockResolvedValue(remainingTabIds);
      calendarEventService.recordRestore.mockResolvedValue();

      const result = await service.restoreWorkState(eventId, calendarId, accessToken);

      expect(calendarEventService.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      // 最初のタブURLでウィンドウを作成
      expect(windowsAdapter.createWindow).toHaveBeenCalledWith(['https://example.com']);
      // 残りのタブのみ復元
      const remainingTabs = tabs.slice(1);
      expect(tabRestoreManager.restoreTabsInOrder).toHaveBeenCalledWith(remainingTabs, window.id, undefined);
      expect(calendarEventService.recordRestore).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining({ value: expect.stringMatching(/^restored-\d+-\d+$/) }), // restoredToEventId
        expect.any(Date),
        calendarId,
        accessToken
      );
      // 最初のタブID + 残りのタブID
      expect(result).toEqual({ windowId: window.id!, tabIds: [100, 101] });
    });

    it('should call onProgress callback', async () => {
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );

      const window = {
        id: 12345,
        focused: true,
        type: 'normal',
        state: 'normal',
        tabs: [{ id: 100 }],
      } as unknown as chrome.windows.Window;

      const remainingTabIds = [101];

      calendarEventService.findById.mockResolvedValue(workState);
      windowsAdapter.createWindow.mockResolvedValue(window);
      tabRestoreManager.restoreTabsInOrder.mockResolvedValue(remainingTabIds);
      calendarEventService.recordRestore.mockResolvedValue();

      const onProgress = jest.fn();
      await service.restoreWorkState(eventId, calendarId, accessToken, onProgress);

      // 残りのタブのみ復元
      const remainingTabs = tabs.slice(1);
      expect(tabRestoreManager.restoreTabsInOrder).toHaveBeenCalledWith(
        remainingTabs,
        window.id,
        onProgress
      );
    });

    it('should throw error if work state not found', async () => {
      calendarEventService.findById.mockResolvedValue(null);

      await expect(
        service.restoreWorkState(eventId, calendarId, accessToken)
      ).rejects.toThrow('WorkState not found');
    });

    it('should throw error if window creation fails', async () => {
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );

      calendarEventService.findById.mockResolvedValue(workState);
      windowsAdapter.createWindow.mockRejectedValue(new Error('Permission denied'));

      await expect(
        service.restoreWorkState(eventId, calendarId, accessToken)
      ).rejects.toThrow('Permission denied');
    });

    it('should throw error if window ID is undefined', async () => {
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );

      const window = {
        focused: true,
        type: 'normal',
        state: 'normal',
        tabs: [{ id: 100 }],
      } as unknown as chrome.windows.Window;

      calendarEventService.findById.mockResolvedValue(workState);
      windowsAdapter.createWindow.mockResolvedValue(window);

      await expect(
        service.restoreWorkState(eventId, calendarId, accessToken)
      ).rejects.toThrow('Window ID is undefined');
    });

    it('should restore single tab work state without calling restoreTabsInOrder', async () => {
      const singleTab = [
        TabInfo.create({ url: 'https://example.com', title: 'Example', index: 0 }),
      ];
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, singleTab, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );

      const window = {
        id: 12345,
        focused: true,
        type: 'normal',
        state: 'normal',
        tabs: [{ id: 100 }],
      } as unknown as chrome.windows.Window;

      calendarEventService.findById.mockResolvedValue(workState);
      windowsAdapter.createWindow.mockResolvedValue(window);
      calendarEventService.recordRestore.mockResolvedValue();

      const result = await service.restoreWorkState(eventId, calendarId, accessToken);

      expect(windowsAdapter.createWindow).toHaveBeenCalledWith(['https://example.com']);
      // 残りのタブがないのでrestoreTabsInOrderは呼ばれない
      expect(tabRestoreManager.restoreTabsInOrder).not.toHaveBeenCalled();
      expect(result).toEqual({ windowId: window.id!, tabIds: [100] });
    });
  });
});
