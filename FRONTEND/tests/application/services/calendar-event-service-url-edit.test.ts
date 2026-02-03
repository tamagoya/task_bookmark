import { CalendarEventService } from '../../../src/application/services/calendar-event-service';
import { CalendarEventRepository } from '../../../src/domain/repositories/calendar-event-repository';
import { EventHandler } from '../../../src/application/handlers/event-handler';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';

describe('CalendarEventService URL編集機能 (Bolt 8)', () => {
  let calendarEventService: CalendarEventService;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockEventHandler: jest.Mocked<EventHandler>;
  
  const eventId = EventId.create('event-id-123');
  const calendarId = CalendarId.create('calendar-id-123');
  const accessToken = AccessToken.create('access-token-123');
  const startTime = new Date('2026-01-21T10:00:00Z');
  const endTime = new Date('2026-01-21T11:00:00Z');
  const version = SchemaVersion.create(1, 0, 0);

  const createMockWorkState = (tabs: TabInfo[]): WorkState => {
    const metadata = WorkStateMetadata.create(version, tabs, new Date());
    return WorkState.create(
      eventId,
      EventTitle.create('テスト仕事'),
      null,
      startTime,
      endTime,
      metadata
    );
  };

  beforeEach(() => {
    mockCalendarEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByDateRange: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockEventHandler = {
      handleUserAuthenticated: jest.fn(),
      handleTokenRefreshed: jest.fn(),
      handleAuthenticationFailed: jest.fn(),
      handleUserLoggedOut: jest.fn(),
      handleCalendarInitialized: jest.fn(),
      handleTaskBookmarkCreated: jest.fn(),
      handleTaskBookmarkUpdated: jest.fn(),
      handleTaskBookmarkDeleted: jest.fn(),
      handleTaskBookmarkCorrupted: jest.fn(),
      handleRestoreRelationRecorded: jest.fn(),
      handleTabsCaptured: jest.fn(),
      handleTabsUpdated: jest.fn(),
    } as unknown as jest.Mocked<EventHandler>;

    calendarEventService = new CalendarEventService(
      mockCalendarEventRepository,
      mockEventHandler
    );
  });

  describe('updateWorkStateTabs', () => {
    it('タブリスト全体を更新できる', async () => {
      const originalTabs = [
        TabInfo.create({ url: 'https://example.com/old', title: 'Old Page', index: 0 }),
      ];
      const newTabs = [
        TabInfo.create({ url: 'https://example.com/new1', title: 'New Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/new2', title: 'New Page 2', index: 1 }),
      ];
      const mockWorkState = createMockWorkState(originalTabs);

      mockCalendarEventRepository.findById.mockResolvedValue(mockWorkState);
      mockCalendarEventRepository.update.mockResolvedValue();

      await calendarEventService.updateWorkStateTabs(eventId, newTabs, calendarId, accessToken);

      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(mockCalendarEventRepository.update).toHaveBeenCalled();
      expect(mockEventHandler.handleTabsUpdated).toHaveBeenCalled();
    });

    it('存在しないWorkStateで更新しようとするとエラーを投げる', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(
        calendarEventService.updateWorkStateTabs(
          eventId,
          [TabInfo.create({ url: 'https://example.com', title: 'Page', index: 0 })],
          calendarId,
          accessToken
        )
      ).rejects.toThrow(`WorkState not found: ${eventId.value}`);
    });
  });

  describe('addTabToWorkState', () => {
    it('タブを追加できる', async () => {
      const originalTabs = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
      ];
      const newTab = TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 });
      const mockWorkState = createMockWorkState(originalTabs);

      mockCalendarEventRepository.findById.mockResolvedValue(mockWorkState);
      mockCalendarEventRepository.update.mockResolvedValue();

      await calendarEventService.addTabToWorkState(eventId, newTab, undefined, calendarId, accessToken);

      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(mockCalendarEventRepository.update).toHaveBeenCalled();
      expect(mockEventHandler.handleTabsUpdated).toHaveBeenCalled();
    });

    it('指定したインデックスにタブを追加できる', async () => {
      const originalTabs = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
      ];
      const newTab = TabInfo.create({ url: 'https://example.com/new', title: 'New Page', index: 0 });
      const mockWorkState = createMockWorkState(originalTabs);

      mockCalendarEventRepository.findById.mockResolvedValue(mockWorkState);
      mockCalendarEventRepository.update.mockResolvedValue();

      await calendarEventService.addTabToWorkState(eventId, newTab, 1, calendarId, accessToken);

      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(mockCalendarEventRepository.update).toHaveBeenCalled();
    });

    it('存在しないWorkStateで追加しようとするとエラーを投げる', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(
        calendarEventService.addTabToWorkState(
          eventId,
          TabInfo.create({ url: 'https://example.com', title: 'Page', index: 0 }),
          undefined,
          calendarId,
          accessToken
        )
      ).rejects.toThrow(`WorkState not found: ${eventId.value}`);
    });
  });

  describe('removeTabFromWorkState', () => {
    it('タブを削除できる', async () => {
      const originalTabs = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
      ];
      const mockWorkState = createMockWorkState(originalTabs);

      mockCalendarEventRepository.findById.mockResolvedValue(mockWorkState);
      mockCalendarEventRepository.update.mockResolvedValue();

      await calendarEventService.removeTabFromWorkState(eventId, 0, calendarId, accessToken);

      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(mockCalendarEventRepository.update).toHaveBeenCalled();
      expect(mockEventHandler.handleTabsUpdated).toHaveBeenCalled();
    });

    it('存在しないWorkStateで削除しようとするとエラーを投げる', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(
        calendarEventService.removeTabFromWorkState(eventId, 0, calendarId, accessToken)
      ).rejects.toThrow(`WorkState not found: ${eventId.value}`);
    });
  });

  describe('reorderWorkStateTabs', () => {
    it('タブの順序を変更できる', async () => {
      const originalTabs = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
        TabInfo.create({ url: 'https://example.com/3', title: 'Page 3', index: 2 }),
      ];
      const mockWorkState = createMockWorkState(originalTabs);

      mockCalendarEventRepository.findById.mockResolvedValue(mockWorkState);
      mockCalendarEventRepository.update.mockResolvedValue();

      await calendarEventService.reorderWorkStateTabs(eventId, 0, 2, calendarId, accessToken);

      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(mockCalendarEventRepository.update).toHaveBeenCalled();
      expect(mockEventHandler.handleTabsUpdated).toHaveBeenCalled();
    });

    it('存在しないWorkStateで順序変更しようとするとエラーを投げる', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(
        calendarEventService.reorderWorkStateTabs(eventId, 0, 1, calendarId, accessToken)
      ).rejects.toThrow(`WorkState not found: ${eventId.value}`);
    });
  });
});
