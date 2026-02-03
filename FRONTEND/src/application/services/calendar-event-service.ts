import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { WorkStateFactory } from '../../domain/factories/work-state-factory';
import { WorkState } from '../../domain/entities/work-state';
import { EventId } from '../../domain/value-objects/event-id';
import { EventTitle } from '../../domain/value-objects/event-title';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { WorkStateMetadata } from '../../domain/value-objects/work-state-metadata';
import { TaskBookmarkCreated } from '../../domain/events/task-bookmark-created';
import { TaskBookmarkUpdated } from '../../domain/events/task-bookmark-updated';
import { TaskBookmarkDeleted } from '../../domain/events/task-bookmark-deleted';
import { TabsUpdated } from '../../domain/events/tabs-updated';
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
   * @param restoredFromEventId 復元元のイベントID（任意、Bolt 7）
   * @param restoredAtTime 復元ボタンを押した時刻（任意、Bolt 7）- これがstartTimeになる
   * @returns 作成されたイベントID
   */
  async createWorkStateEvent(
    tabs: TabInfo[],
    title: string,
    calendarId: CalendarId,
    accessToken: AccessToken,
    memo?: string,
    restoredFromEventId?: EventId,
    restoredAtTime?: Date
  ): Promise<EventId> {
    const eventTitle = EventTitle.create(title);
    // US-3の要件: 保存実行時の時刻を終了時間とする
    // 復元からの保存の場合は、復元ボタンを押した時刻を開始時間とする
    // 通常の保存の場合は、30分前を開始時間とする
    const endTime = new Date(); // 現在時刻
    const startTime = restoredAtTime || new Date(endTime.getTime() - 30 * 60 * 1000);

    // 一時的なイベントIDを生成（実際のIDは保存後に取得）
    const tempEventId = EventId.create(`temp-${Date.now()}`);

    const workState = WorkStateFactory.createFromTabs(
      tempEventId,
      eventTitle,
      tabs,
      startTime,
      endTime,
      memo,
      restoredFromEventId
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
    return await this.calendarEventRepository.findById(eventId, calendarId, accessToken);
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

  /**
   * 復元メタデータを記録
   * @param eventId 復元元のイベントID
   * @param restoredToEventId 復元先のイベントID（新しく作成されたWorkStateのID）
   * @param restoredAt 復元日時
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async recordRestore(
    eventId: EventId,
    restoredToEventId: EventId,
    restoredAt: Date,
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

    if (!existingWorkState.metadata) {
      throw new Error(`WorkState metadata not found: ${eventId.value}`);
    }

    // restoredToに新しい復元情報を追加（イミュータビリティのため新しいメタデータを作成）
    const existingMetadata = existingWorkState.metadata;
    const existingRestoredTo = existingMetadata.restoredTo || [];
    const updatedRestoredTo = [
      ...existingRestoredTo,
      {
        eventId: restoredToEventId.value,
        restoredAt: restoredAt.toISOString(),
      },
    ];

    // 新しいメタデータを作成（createFromRawを使用）
    const updatedMetadata = WorkStateMetadata.createFromRaw(
      {
        ...existingMetadata.toJSON(),
        restoredTo: updatedRestoredTo,
      },
      existingMetadata.version
    );

    // WorkStateを更新
    existingWorkState.updateMetadata(updatedMetadata);

    // カレンダーに保存
    await this.calendarEventRepository.update(existingWorkState, calendarId, accessToken);
  }

  /**
   * タブリスト全体を更新（Bolt 8: URL編集機能）
   * @param eventId イベントID
   * @param newTabs 新しいタブリスト
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async updateWorkStateTabs(
    eventId: EventId,
    newTabs: TabInfo[],
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

    // タブリストを更新（イミュータビリティのため新しいインスタンスを返す）
    const updatedWorkState = existingWorkState.updateTabs(newTabs);

    // カレンダーに保存
    await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTabsUpdated(
      new TabsUpdated(eventId.value, newTabs, 'update', undefined, new Date())
    );
  }

  /**
   * タブを追加（Bolt 8: URL編集機能）
   * @param eventId イベントID
   * @param tab 追加するタブ
   * @param index 追加位置（任意、指定しない場合は末尾）
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async addTabToWorkState(
    eventId: EventId,
    tab: TabInfo,
    index: number | undefined,
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

    // タブを追加（イミュータビリティのため新しいインスタンスを返す）
    const updatedWorkState = existingWorkState.addTab(tab, index);

    // カレンダーに保存
    await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTabsUpdated(
      new TabsUpdated(
        eventId.value,
        updatedWorkState.metadata?.tabs || [],
        'add',
        { addedTab: tab, toIndex: index },
        new Date()
      )
    );
  }

  /**
   * タブを削除（Bolt 8: URL編集機能）
   * @param eventId イベントID
   * @param tabIndex 削除するタブのインデックス
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async removeTabFromWorkState(
    eventId: EventId,
    tabIndex: number,
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

    // タブを削除（イミュータビリティのため新しいインスタンスを返す）
    const updatedWorkState = existingWorkState.removeTab(tabIndex);

    // カレンダーに保存
    await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTabsUpdated(
      new TabsUpdated(
        eventId.value,
        updatedWorkState.metadata?.tabs || [],
        'remove',
        { removedTabIndex: tabIndex },
        new Date()
      )
    );
  }

  /**
   * タブの順序を変更（Bolt 8: URL編集機能）
   * @param eventId イベントID
   * @param fromIndex 移動元のインデックス
   * @param toIndex 移動先のインデックス
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  async reorderWorkStateTabs(
    eventId: EventId,
    fromIndex: number,
    toIndex: number,
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

    // タブの順序を変更（イミュータビリティのため新しいインスタンスを返す）
    const updatedWorkState = existingWorkState.reorderTabs(fromIndex, toIndex);

    // カレンダーに保存
    await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

    // Domain Eventを発行
    await this.eventHandler.handleTabsUpdated(
      new TabsUpdated(
        eventId.value,
        updatedWorkState.metadata?.tabs || [],
        'reorder',
        { fromIndex, toIndex },
        new Date()
      )
    );
  }
}
