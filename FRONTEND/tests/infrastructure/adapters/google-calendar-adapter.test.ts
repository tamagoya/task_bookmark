import { GoogleCalendarAdapter } from '../../../src/infrastructure/adapters/google-calendar-adapter';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { RetryHandler } from '../../../src/infrastructure/adapters/retry-handler';

// RetryHandlerのモック
jest.mock('../../../src/infrastructure/adapters/retry-handler');

// fetchのモック
global.fetch = jest.fn();

describe('GoogleCalendarAdapter', () => {
  let adapter: GoogleCalendarAdapter;
  let mockRetryHandler: jest.Mocked<RetryHandler>;

  beforeEach(() => {
    mockRetryHandler = {
      executeWithRetry: jest.fn(),
    } as unknown as jest.Mocked<RetryHandler>;

    (RetryHandler as jest.Mock).mockImplementation(() => mockRetryHandler);
    adapter = new GoogleCalendarAdapter();
    jest.clearAllMocks();
  });

  describe('createCalendar', () => {
    it('正常にカレンダーを作成できる', async () => {
      const calendarName = 'テストカレンダー';
      const accessToken = 'test-access-token';
      const calendarId = 'calendar-id-12345';
      const mockCalendar = { id: calendarId, summary: calendarName };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockCalendar),
      } as unknown as Response;

      // fetchをモック
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await adapter.createCalendar(calendarName, accessToken);

      expect(result).toBeInstanceOf(CalendarId);
      expect(result.value).toBe(calendarId);
      expect(mockRetryHandler.executeWithRetry).toHaveBeenCalled();
    });

    it('エラーが発生した場合はエラーを投げる', async () => {
      const calendarName = 'テストカレンダー';
      const accessToken = 'test-access-token';
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      } as unknown as Response;

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(adapter.createCalendar(calendarName, accessToken)).rejects.toThrow('Failed to create calendar');
    });
  });

  describe('getCalendar', () => {
    it('正常にカレンダーを取得できる', async () => {
      const calendarId = 'calendar-id-12345';
      const accessToken = 'test-access-token';
      const mockCalendar = { id: calendarId, summary: 'テストカレンダー' };

      mockRetryHandler.executeWithRetry.mockResolvedValue(mockCalendar);

      const result = await adapter.getCalendar(calendarId, accessToken);

      expect(result).toEqual(mockCalendar);
      expect(mockRetryHandler.executeWithRetry).toHaveBeenCalled();
    });

    it('カレンダーが見つからない場合はエラーを投げる', async () => {
      const calendarId = 'calendar-id-12345';
      const accessToken = 'test-access-token';
      const mockResponse = {
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found'),
      } as unknown as Response;

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(adapter.getCalendar(calendarId, accessToken)).rejects.toThrow('Calendar not found');
    });

    it('その他のエラーが発生した場合はエラーを投げる', async () => {
      const calendarId = 'calendar-id-12345';
      const accessToken = 'test-access-token';
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response;

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(adapter.getCalendar(calendarId, accessToken)).rejects.toThrow('Failed to get calendar');
    });
  });

  describe('listCalendars', () => {
    it('正常にカレンダー一覧を取得できる', async () => {
      const accessToken = 'test-access-token';
      const mockCalendars = [
        { id: 'calendar-id-1', summary: 'カレンダー1' },
        { id: 'calendar-id-2', summary: 'カレンダー2' },
      ];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockCalendars }),
      } as unknown as Response;

      // fetchをモック
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await adapter.listCalendars(accessToken);

      expect(result).toEqual(mockCalendars);
      expect(mockRetryHandler.executeWithRetry).toHaveBeenCalled();
    });

    it('エラーが発生した場合はエラーを投げる', async () => {
      const accessToken = 'test-access-token';
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response;

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(adapter.listCalendars(accessToken)).rejects.toThrow('Failed to list calendars');
    });

    it('itemsが存在しない場合は空配列を返す', async () => {
      const accessToken = 'test-access-token';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response;

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await adapter.listCalendars(accessToken);

      expect(result).toEqual([]);
    });
  });

  describe('findOrCreateCalendar', () => {
    it('既存のカレンダーが見つかった場合は、それを返す', async () => {
      const accessToken = 'test-access-token';
      const existingCalendar = { id: 'calendar-id-12345', summary: 'タスクブックマーク' };
      const mockCalendars = [existingCalendar];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockCalendars }),
      } as unknown as Response;

      // fetchをモック
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await adapter.findOrCreateCalendar(accessToken);

      expect(result).toBeInstanceOf(CalendarId);
      expect(result.value).toBe('calendar-id-12345');
    });

    it('既存のカレンダーが見つからない場合は、新規作成する', async () => {
      const accessToken = 'test-access-token';
      const mockCalendars: unknown[] = [];
      const newCalendar = { id: 'calendar-id-12345', summary: 'タスクブックマーク' };
      
      const listResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockCalendars }),
      } as unknown as Response;
      
      const createResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(newCalendar),
      } as unknown as Response;

      // fetchをモック（2回呼ばれる: listCalendars, createCalendar）
      global.fetch = jest.fn()
        .mockResolvedValueOnce(listResponse)
        .mockResolvedValueOnce(createResponse);
      
      mockRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await adapter.findOrCreateCalendar(accessToken);

      expect(result).toBeInstanceOf(CalendarId);
      expect(result.value).toBe('calendar-id-12345');
    });
  });
});
