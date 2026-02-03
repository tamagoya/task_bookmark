import { CalendarEventService } from './calendar-event-service';
import { WorkState } from '../../domain/entities/work-state';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';
import { CacheDecorator } from '../decorators/cache-decorator';

/**
 * OptimizedCalendarEventService
 * パフォーマンス監視とキャッシュ機能が統合されたカレンダーイベントサービス
 * 
 * ADR-026に準拠: Decoratorパターンで既存サービスをラップ
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
    private readonly baseService: CalendarEventService,
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
        const eventId = await this.baseService.createWorkStateEvent(
          tabs,
          title,
          calendarId,
          accessToken,
          memo,
          restoredFromEventId,
          restoredAtTime
        );

        // キャッシュを無効化（新しいデータが追加されたため）
        await this.invalidateWorkStateListCache(calendarId, accessToken);

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
      () => this.baseService.findById(eventId, calendarId, accessToken)
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
      () => this.performanceInterceptor.intercept(
        'getWorkStateEvents',
        () => this.baseService.getWorkStateEvents(startDate, endDate, calendarId, accessToken)
      ),
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
        await this.baseService.updateWorkStateEvent(eventId, updates, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
        await this.baseService.deleteWorkStateEvent(eventId, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
        await this.baseService.recordRestore(
          eventId,
          restoredToEventId,
          restoredAt,
          calendarId,
          accessToken
        );

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
        await this.baseService.updateWorkStateTabs(eventId, newTabs, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
        await this.baseService.addTabToWorkState(eventId, tab, index, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
        await this.baseService.removeTabFromWorkState(eventId, tabIndex, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
        await this.baseService.reorderWorkStateTabs(eventId, fromIndex, toIndex, calendarId, accessToken);

        // キャッシュを無効化
        await this.invalidateWorkStateListCache(calendarId, accessToken);
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
