import { CalendarEventRepositoryImpl } from '../../../src/infrastructure/repositories/calendar-event-repository-impl';
import { GoogleCalendarAdapter, CalendarEvent } from '../../../src/infrastructure/adapters/google-calendar-adapter';
import { EventHandler } from '../../../src/application/handlers/event-handler';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { WorkStateFactory } from '../../../src/domain/factories/work-state-factory';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

// モック
jest.mock('../../../src/infrastructure/adapters/google-calendar-adapter');
jest.mock('../../../src/application/handlers/event-handler');

describe('CalendarEventRepositoryImpl', () => {
  let repository: CalendarEventRepositoryImpl;
  let adapter: jest.Mocked<GoogleCalendarAdapter>;
  let eventHandler: jest.Mocked<EventHandler>;

  const calendarId = CalendarId.create('calendar-id-12345');
  const accessToken = AccessToken.create('valid-access-token-12345');
  const eventId = EventId.create('event-id-12345');
  const tabs: TabInfo[] = [
    {
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    },
  ];

  beforeEach(() => {
    adapter = {
      createEvent: jest.fn(),
      getEvent: jest.fn(),
      listEvents: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
    } as unknown as jest.Mocked<GoogleCalendarAdapter>;

    eventHandler = {
      handleTaskBookmarkCorrupted: jest.fn(),
    } as unknown as jest.Mocked<EventHandler>;

    repository = new CalendarEventRepositoryImpl(adapter, eventHandler);
  });

  describe('save', () => {
    it('正常に仕事状態を保存できる', async () => {
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const workState = WorkStateFactory.createFromTabs(
        eventId,
        EventTitle.create('仕事名'),
        tabs,
        startTime,
        endTime
      );
      adapter.createEvent.mockResolvedValue(eventId.value);

      const result = await repository.save(workState, calendarId, accessToken);

      expect(result).toEqual(eventId);
      expect(adapter.createEvent).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('正常に仕事状態を取得できる', async () => {
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const calendarEvent: CalendarEvent = {
        id: eventId.value,
        summary: '仕事名',
        description: JSON.stringify({
          version: '1.0.0',
          tabs: tabs,
          savedAt: startTime.toISOString(),
        }),
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: endTime.toISOString(),
        },
      };
      adapter.getEvent.mockResolvedValue(calendarEvent);

      const result = await repository.findById(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(adapter.getEvent).toHaveBeenCalledWith(
        calendarId.value,
        eventId.value,
        accessToken.value
      );
    });

    it('存在しないイベントIDの場合はnullを返す', async () => {
      adapter.getEvent.mockRejectedValue(new Error('Event not found'));

      const result = await repository.findById(eventId, calendarId, accessToken);

      expect(result).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    it('正常に仕事状態の一覧を取得できる', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const eventStartTime = new Date('2026-01-15T10:00:00Z');
      const eventEndTime = new Date('2026-01-15T11:00:00Z');
      const calendarEvents: CalendarEvent[] = [
        {
          id: eventId.value,
          summary: '仕事名',
          description: JSON.stringify({
            version: '1.0.0',
            tabs: tabs,
            savedAt: eventStartTime.toISOString(),
          }),
          start: {
            dateTime: eventStartTime.toISOString(),
          },
          end: {
            dateTime: eventEndTime.toISOString(),
          },
        },
      ];
      adapter.listEvents.mockResolvedValue(calendarEvents);

      const result = await repository.findByDateRange(
        startDate,
        endDate,
        calendarId,
        accessToken
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(adapter.listEvents).toHaveBeenCalledWith(
        calendarId.value,
        startDate,
        endDate,
        accessToken.value
      );
    });
  });

  describe('update', () => {
    it('正常に仕事状態を更新できる', async () => {
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const workState = WorkStateFactory.createFromTabs(
        eventId,
        EventTitle.create('仕事名'),
        tabs,
        startTime,
        endTime
      );
      adapter.updateEvent.mockResolvedValue();

      await repository.update(workState, calendarId, accessToken);

      expect(adapter.updateEvent).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('正常に仕事状態を削除できる', async () => {
      adapter.deleteEvent.mockResolvedValue();

      await repository.delete(eventId, calendarId, accessToken);

      expect(adapter.deleteEvent).toHaveBeenCalledWith(
        calendarId.value,
        eventId.value,
        accessToken.value
      );
    });
  });
});
