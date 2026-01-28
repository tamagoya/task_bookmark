import { CalendarId } from '../../domain/value-objects/calendar-id';
import { RetryHandler } from './retry-handler';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
}

/**
 * GoogleCalendarAdapter
 * Google Calendar APIとの通信を担当
 */
export class GoogleCalendarAdapter {
  private readonly API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
  private readonly CALENDAR_NAME = 'タスクブックマーク';
  private readonly retryHandler = new RetryHandler();

  /**
   * カレンダーを作成
   * @param name カレンダー名
   * @param accessToken アクセストークン
   * @returns カレンダーID
   */
  async createCalendar(name: string, accessToken: string): Promise<CalendarId> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(`${this.API_BASE_URL}/calendars`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: name,
          description: 'タスクブックマーク用のカレンダー',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create calendar: ${response.status} ${errorText}`);
      }

      const calendar = await response.json() as Calendar;
      return CalendarId.create(calendar.id);
    });
  }

  /**
   * カレンダーを取得
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns カレンダー
   */
  async getCalendar(calendarId: string, accessToken: string): Promise<Calendar> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(`${this.API_BASE_URL}/calendars/${calendarId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Calendar not found');
        }
        const errorText = await response.text();
        throw new Error(`Failed to get calendar: ${response.status} ${errorText}`);
      }

      return await response.json() as Calendar;
    });
  }

  /**
   * カレンダー一覧を取得
   * @param accessToken アクセストークン
   * @returns カレンダー一覧
   */
  async listCalendars(accessToken: string): Promise<Calendar[]> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(`${this.API_BASE_URL}/users/me/calendarList`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list calendars: ${response.status} ${errorText}`);
      }

      const data = await response.json() as { items: Calendar[] };
      return data.items || [];
    });
  }

  /**
   * 専用カレンダーを検索または作成
   * @param accessToken アクセストークン
   * @returns カレンダーID
   */
  async findOrCreateCalendar(accessToken: string): Promise<CalendarId> {
    // 既存のカレンダーを検索
    const calendars = await this.listCalendars(accessToken);
    const existingCalendar = calendars.find(
      (cal) => cal.summary === this.CALENDAR_NAME
    );

    if (existingCalendar) {
      return CalendarId.create(existingCalendar.id);
    }

    // 存在しない場合は作成
    return this.createCalendar(this.CALENDAR_NAME, accessToken);
  }

  /**
   * カレンダーイベントを作成
   * @param calendarId カレンダーID
   * @param event カレンダーイベント
   * @param accessToken アクセストークン
   * @returns イベントID
   */
  async createEvent(
    calendarId: string,
    event: CalendarEvent,
    accessToken: string
  ): Promise<string> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create event: ${response.status} ${errorText}`);
      }

      const createdEvent = await response.json() as CalendarEvent;
      if (!createdEvent.id) {
        throw new Error('Created event ID is missing');
      }
      return createdEvent.id;
    });
  }

  /**
   * カレンダーイベントを取得
   * @param calendarId カレンダーID
   * @param eventId イベントID
   * @param accessToken アクセストークン
   * @returns カレンダーイベント
   */
  async getEvent(calendarId: string, eventId: string, accessToken: string): Promise<CalendarEvent> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Event not found');
        }
        const errorText = await response.text();
        throw new Error(`Failed to get event: ${response.status} ${errorText}`);
      }

      return await response.json() as CalendarEvent;
    });
  }

  /**
   * カレンダーイベント一覧を取得
   * @param calendarId カレンダーID
   * @param startDate 開始日
   * @param endDate 終了日
   * @param accessToken アクセストークン
   * @returns カレンダーイベント一覧
   */
  async listEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date,
    accessToken: string
  ): Promise<CalendarEvent[]> {
    return this.retryHandler.executeWithRetry(async () => {
      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();
      const url = `${this.API_BASE_URL}/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list events: ${response.status} ${errorText}`);
      }

      const data = await response.json() as { items: CalendarEvent[] };
      return data.items || [];
    });
  }

  /**
   * カレンダーイベントを更新
   * @param calendarId カレンダーID
   * @param eventId イベントID
   * @param event カレンダーイベント
   * @param accessToken アクセストークン
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: CalendarEvent,
    accessToken: string
  ): Promise<void> {
    await this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update event: ${response.status} ${errorText}`);
      }
    });
  }

  /**
   * カレンダーイベントを削除
   * @param calendarId カレンダーID
   * @param eventId イベントID
   * @param accessToken アクセストークン
   */
  async deleteEvent(calendarId: string, eventId: string, accessToken: string): Promise<void> {
    await this.retryHandler.executeWithRetry(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Event not found');
        }
        const errorText = await response.text();
        throw new Error(`Failed to delete event: ${response.status} ${errorText}`);
      }
    });
  }
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}
