import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { WorkState } from '../../domain/entities/work-state';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { GoogleCalendarAdapter, CalendarEvent } from '../adapters/google-calendar-adapter';
import { WorkStateFactory } from '../../domain/factories/work-state-factory';
import { EventDescription } from '../../domain/value-objects/event-description';
import { ValidationError } from '../../domain/value-objects/validation-error';
import { TaskBookmarkCorrupted } from '../../domain/events/task-bookmark-corrupted';
import { EventHandler } from '../../application/handlers/event-handler';

/**
 * CalendarEventRepositoryImpl
 * CalendarEventRepositoryインターフェースの実装
 * Google Calendar APIを使用した永続化
 */
export class CalendarEventRepositoryImpl implements CalendarEventRepository {
  constructor(
    private readonly googleCalendarAdapter: GoogleCalendarAdapter,
    private readonly eventHandler: EventHandler
  ) {}

  /**
   * 仕事状態をカレンダーイベントとして保存
   * @param workState 仕事状態
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 作成されたイベントID
   */
  async save(
    workState: WorkState,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<EventId> {
    const description = workState.description
      ? workState.description.value
      : workState.metadata
      ? EventDescription.create(workState.metadata).value
      : '';

    const calendarEvent: CalendarEvent = {
      summary: workState.title.value,
      description: description,
      start: {
        dateTime: workState.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: workState.endTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    const eventIdString = await this.googleCalendarAdapter.createEvent(
      calendarId.value,
      calendarEvent,
      accessToken.value
    );

    return EventId.create(eventIdString);
  }

  /**
   * イベントIDで仕事状態を取得
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 見つかった場合はWorkState、見つからない場合はnull
   */
  async findById(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState | null> {
    try {
      const calendarEvent = await this.googleCalendarAdapter.getEvent(
        calendarId.value,
        eventId.value,
        accessToken.value
      );

      return this._convertCalendarEventToWorkState(calendarEvent, eventId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 日付範囲で仕事状態の一覧を取得
   * @param startDate 開始日
   * @param endDate 終了日
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 該当する仕事状態の配列（破損データも含む）
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState[]> {
    const calendarEvents = await this.googleCalendarAdapter.listEvents(
      calendarId.value,
      startDate,
      endDate,
      accessToken.value
    );

    const workStates: WorkState[] = [];

    for (const calendarEvent of calendarEvents) {
      try {
        if (!calendarEvent.id) {
          console.error('Calendar event ID is missing, skipping');
          continue;
        }
        const eventId = EventId.create(calendarEvent.id);
        const workState = this._convertCalendarEventToWorkState(calendarEvent, eventId);
        if (workState) {
          workStates.push(workState);
        }
      } catch (error) {
        // 個別のイベントの変換エラーは無視し、次のイベントを処理
        console.error(`Failed to convert calendar event to work state: ${error}`);
      }
    }

    return workStates;
  }

  /**
   * 仕事状態を更新
   * @param workState 仕事状態
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async update(
    workState: WorkState,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    // メタデータが存在する場合は常にメタデータから新しいdescriptionを生成
    // （restoredToなどの更新を反映するため）
    const description = workState.metadata
      ? EventDescription.create(workState.metadata).value
      : workState.description
      ? workState.description.value
      : '';

    const calendarEvent: CalendarEvent = {
      id: workState.eventId.value,
      summary: workState.title.value,
      description: description,
      start: {
        dateTime: workState.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: workState.endTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    await this.googleCalendarAdapter.updateEvent(
      calendarId.value,
      workState.eventId.value,
      calendarEvent,
      accessToken.value
    );
  }

  /**
   * 仕事状態を削除
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async delete(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    await this.googleCalendarAdapter.deleteEvent(
      calendarId.value,
      eventId.value,
      accessToken.value
    );
  }

  /**
   * カレンダーイベントをWorkStateに変換
   * @param calendarEvent カレンダーイベント
   * @param eventId イベントID
   * @returns WorkState（破損データの場合はisCorrupted: true）
   */
  private _convertCalendarEventToWorkState(
    calendarEvent: CalendarEvent,
    eventId: EventId
  ): WorkState | null {
    try {
      const startTime = new Date(calendarEvent.start.dateTime);
      const endTime = new Date(calendarEvent.end.dateTime);
      const description = calendarEvent.description || '';

      const workState = WorkStateFactory.createFromCalendarEvent(
        eventId,
        calendarEvent.summary,
        description,
        startTime,
        endTime
      );

      // 破損データが検出された場合、Domain Eventを発行
      if (workState.isCorrupted) {
        this.eventHandler.handleTaskBookmarkCorrupted(
          new TaskBookmarkCorrupted(
            eventId.value,
            workState.validationErrors,
            new Date(),
            workState.canPartiallyLoad()
          )
        );
      }

      return workState;
    } catch (error) {
      // 完全に読み込めない場合は、破損イベントとして作成
      const errors = [
        ValidationError.create(
          'description',
          'INVALID_JSON',
          `Failed to parse calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CRITICAL',
          false
        ),
      ];

      const startTime = calendarEvent.start?.dateTime
        ? new Date(calendarEvent.start.dateTime)
        : new Date();
      const endTime = calendarEvent.end?.dateTime
        ? new Date(calendarEvent.end.dateTime)
        : new Date();

      return WorkStateFactory.createFromCorruptedEvent(
        eventId,
        calendarEvent.summary,
        calendarEvent.description || null,
        startTime,
        endTime,
        errors
      );
    }
  }
}
