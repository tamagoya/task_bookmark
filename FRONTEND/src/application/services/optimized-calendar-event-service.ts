import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { WorkStateFactory } from '../../domain/factories/work-state-factory';
import { WorkState } from '../../domain/entities/work-state';
import { EventId } from '../../domain/value-objects/event-id';
import { EventTitle } from '../../domain/value-objects/event-title';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { WorkStateMetadata } from '../../domain/value-objects/work-state-metadata';
import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { TaskBookmarkCreated } from '../../domain/events/task-bookmark-created';
import { TaskBookmarkUpdated } from '../../domain/events/task-bookmark-updated';
import { TaskBookmarkDeleted } from '../../domain/events/task-bookmark-deleted';
import { TabsUpdated } from '../../domain/events/tabs-updated';
import { EventHandler } from '../handlers/event-handler';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';
import { CacheDecorator } from '../decorators/cache-decorator';

/**
 * OptimizedCalendarEventService
 * パフォーマンス監視とキャッシュ機能が統合されたカレンダーイベントサービス
 * 
 * NFR要件:
 * - カレンダーイベントの保存: 2秒以内
 * - 保存済み仕事の一覧取得: 3秒以内
 * - キャッシュTTL: 30秒（一覧取得用）
 */
export class OptimizedCalendarEventService {
  // キャッシュ戦略: 30秒間キャッシュ、最大100件
  private readonly workStateListCacheStrategy = CacheStrategy.create(
    'getWorkStateEvents',
    30,
    100,
    'LRU'
  );

  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly eventHandler: EventHandler,
    private readonly performanceInterceptor: PerformanceInterceptor,
    private readonly cacheDecorator: CacheDecorator
  ) {}

  /**
   * 仕事状態をカレンダーイベントとして保存
   * パフォーマンス監視: 2秒以内
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
    return this.performanceInterceptor.intercept(
      'createWorkStateEvent',
      async () => {
        const eventTitle = EventTitle.create(title);
        const endTime = new Date();
        const startTime = restoredAtTime || new Date(endTime.getTime() - 30 * 60 * 1000);

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

        const eventId = await this.calendarEventRepository.save(workState, calendarId, accessToken);

        // キャッシュを無効化（新しいデータが追加されたため）
        await this.invalidateWorkStateListCache(calendarId, accessToken);

        await this.eventHandler.handleTaskBookmarkCreated(
          new TaskBookmarkCreated(eventId.value, title, new Date())
        );

        return eventId;
      }
    );
  }

  /**
   * イベントIDで仕事状態を取得
   */
  async findById(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState | null> {
    return this.performanceInterceptor.intercept(
      'findById',
      async () => {
        return await this.calendarEventRepository.findById(eventId, calendarId, accessToken);
      }
    );
  }

  /**
   * 保存済み仕事状態の一覧取得
   * パフォーマンス監視: 3秒以内
   * キャッシュ: 30秒間
   */
  async getWorkStateEvents(
    startDate: Date,
    endDate: Date,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState[]> {
    const cacheParams = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendarId: calendarId.value,
    };

    return this.cacheDecorator.withCache(
      'getWorkStateEvents',
      cacheParams,
      async () => {
        return this.performanceInterceptor.intercept(
          'getWorkStateEvents',
          async () => {
            return await this.calendarEventRepository.findByDateRange(
              startDate,
              endDate,
              calendarId,
              accessToken
            );
          }
        );
      },
      this.workStateListCacheStrategy
    );
  }

  /**
   * イベントの更新
   */
  async updateWorkStateEvent(
    eventId: EventId,
    updates: Partial<WorkState>,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'updateWorkStateEvent',
      async () => {
        const existingWorkState = await this.calendarEventRepository.findById(
          eventId,
          calendarId,
          accessToken
        );

        if (!existingWorkState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        const updatedWorkState = existingWorkState;
        const updatedFields: string[] = [];

        if (updates.title) {
          updatedWorkState.updateTitle(updates.title);
          updatedFields.push('title');
        }

        if (updates.metadata) {
          updatedWorkState.updateMetadata(updates.metadata);
          updatedFields.push('metadata');
        }

        await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

        await this.eventHandler.handleTaskBookmarkUpdated(
          new TaskBookmarkUpdated(eventId.value, updatedFields, new Date())
        );
      }
    );
  }

  /**
   * イベントの削除
   */
  async deleteWorkStateEvent(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'deleteWorkStateEvent',
      async () => {
        await this.calendarEventRepository.delete(eventId, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

        await this.eventHandler.handleTaskBookmarkDeleted(
          new TaskBookmarkDeleted(eventId.value, new Date())
        );
      }
    );
  }

  /**
   * 復元メタデータを記録
   */
  async recordRestore(
    eventId: EventId,
    restoredToEventId: EventId,
    restoredAt: Date,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'recordRestore',
      async () => {
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

        const existingMetadata = existingWorkState.metadata;
        const existingRestoredTo = existingMetadata.restoredTo || [];
        const updatedRestoredTo = [
          ...existingRestoredTo,
          {
            eventId: restoredToEventId.value,
            restoredAt: restoredAt.toISOString(),
          },
        ];

        const updatedMetadata = WorkStateMetadata.createFromRaw(
          {
            ...existingMetadata.toJSON(),
            restoredTo: updatedRestoredTo,
          },
          existingMetadata.version
        );

        existingWorkState.updateMetadata(updatedMetadata);

        await this.calendarEventRepository.update(existingWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
      }
    );
  }

  /**
   * タブリスト全体を更新
   */
  async updateWorkStateTabs(
    eventId: EventId,
    newTabs: TabInfo[],
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'updateWorkStateTabs',
      async () => {
        const existingWorkState = await this.calendarEventRepository.findById(
          eventId,
          calendarId,
          accessToken
        );

        if (!existingWorkState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        const updatedWorkState = existingWorkState.updateTabs(newTabs);

        await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

        await this.eventHandler.handleTabsUpdated(
          new TabsUpdated(eventId.value, newTabs, 'update', undefined, new Date())
        );
      }
    );
  }

  /**
   * タブを追加
   */
  async addTabToWorkState(
    eventId: EventId,
    tab: TabInfo,
    index: number | undefined,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'addTabToWorkState',
      async () => {
        const existingWorkState = await this.calendarEventRepository.findById(
          eventId,
          calendarId,
          accessToken
        );

        if (!existingWorkState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        const updatedWorkState = existingWorkState.addTab(tab, index);

        await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

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
    );
  }

  /**
   * タブを削除
   */
  async removeTabFromWorkState(
    eventId: EventId,
    tabIndex: number,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'removeTabFromWorkState',
      async () => {
        const existingWorkState = await this.calendarEventRepository.findById(
          eventId,
          calendarId,
          accessToken
        );

        if (!existingWorkState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        const updatedWorkState = existingWorkState.removeTab(tabIndex);

        await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

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
    );
  }

  /**
   * タブの順序を変更
   */
  async reorderWorkStateTabs(
    eventId: EventId,
    fromIndex: number,
    toIndex: number,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void> {
    return this.performanceInterceptor.intercept(
      'reorderWorkStateTabs',
      async () => {
        const existingWorkState = await this.calendarEventRepository.findById(
          eventId,
          calendarId,
          accessToken
        );

        if (!existingWorkState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        const updatedWorkState = existingWorkState.reorderTabs(fromIndex, toIndex);

        await this.calendarEventRepository.update(updatedWorkState, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);

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
    );
  }

  /**
   * 一覧キャッシュを無効化
   */
  private async invalidateWorkStateListCache(
    _calendarId: CalendarId,
    _accessToken: AccessToken
  ): Promise<void> {
    // calendarIdを含むすべてのキャッシュを無効化
    // 現在の実装では、キャッシュキーにcalendarIdが含まれているため、
    // 全キャッシュをクリアするか、特定のパターンにマッチするキャッシュを無効化する
    // 簡易実装として、全キャッシュをクリア
    await this.cacheDecorator.clearAll();
  }
}
