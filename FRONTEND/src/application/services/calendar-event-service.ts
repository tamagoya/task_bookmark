import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { WorkStateFactory } from '../../domain/factories/work-state-factory';
import { WorkState } from '../../domain/entities/work-state';
import { EventId } from '../../domain/value-objects/event-id';
import { EventTitle } from '../../domain/value-objects/event-title';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { TaskBookmarkCreated } from '../../domain/events/task-bookmark-created';
import { TaskBookmarkUpdated } from '../../domain/events/task-bookmark-updated';
import { TaskBookmarkDeleted } from '../../domain/events/task-bookmark-deleted';
import { EventHandler } from '../handlers/event-handler';

/**
 * CalendarEventService
 * カレンダーイベントのCRUD操作を担当
 */
export class CalendarEventService {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly eventHandler: EventHandler
  ) {}

  /**
   * 仕事状態をカレンダーイベントとして保存
   * @param tabs タブ情報の配列
   * @param title 仕事名
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @param memo メモ（任意）
   * @returns 作成されたイベントID
   */
  async createWorkStateEvent(
    tabs: TabInfo[],
    title: string,
    calendarId: CalendarId,
    accessToken: AccessToken,
    memo?: string
  ): Promise<EventId> {
    const eventTitle = EventTitle.create(title);
    // US-3の要件: 保存実行時の時刻を終了時間として、30分前を開始時間とする
    const endTime = new Date(); // 現在時刻
    const startTime = new Date(endTime.getTime() - 30 * 60 * 1000); // 30分前

    // 一時的なイベントIDを生成（実際のIDは保存後に取得）
    const tempEventId = EventId.create(`temp-${Date.now()}`);

    const workState = WorkStateFactory.createFromTabs(
      tempEventId,
      eventTitle,
      tabs,
      startTime,
      endTime,
      memo
    );

    // カレンダーに保存
    const eventId = await this.calendarEventRepository.save(workState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTaskBookmarkCreated(
      new TaskBookmarkCreated(eventId.value, title, new Date())
    );

    return eventId;
  }

  /**
   * 保存済み仕事状態の一覧取得
   * @param startDate 開始日
   * @param endDate 終了日
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 仕事状態の配列
   */
  async getWorkStateEvents(
    startDate: Date,
    endDate: Date,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState[]> {
    return await this.calendarEventRepository.findByDateRange(
      startDate,
      endDate,
      calendarId,
      accessToken
    );
  }

  /**
   * イベントの更新（URL編集、メタデータ更新）
   * @param eventId イベントID
   * @param updates 更新内容
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async updateWorkStateEvent(
    eventId: EventId,
    updates: Partial<WorkState>,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    // 既存のWorkStateを取得
    const existingWorkState = await this.calendarEventRepository.findById(
      eventId,
      calendarId,
      accessToken
    );

    if (!existingWorkState) {
      throw new Error(`WorkState not found: ${eventId.value}`);
    }

    // 更新を適用（イミュータビリティのため新しいインスタンスを作成）
    let updatedWorkState = existingWorkState;
    const updatedFields: string[] = [];

    if (updates.title) {
      updatedWorkState.updateTitle(updates.title);
      updatedFields.push('title');
    }

    if (updates.metadata) {
      updatedWorkState.updateMetadata(updates.metadata);
      updatedFields.push('metadata');
    }

    // カレンダーに保存
    await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTaskBookmarkUpdated(
      new TaskBookmarkUpdated(eventId.value, updatedFields, new Date())
    );
  }

  /**
   * イベントの削除
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async deleteWorkStateEvent(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    await this.calendarEventRepository.delete(eventId, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTaskBookmarkDeleted(
      new TaskBookmarkDeleted(eventId.value, new Date())
    );
  }
}
