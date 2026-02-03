import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { CalendarEventService } from './calendar-event-service';
import { OptimizedTabRestoreManager } from './optimized-tab-restore-manager';
import { Logger } from '../../infrastructure/adapters/logger';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';

/**
 * OptimizedRestoreService
 * パフォーマンス監視が統合された仕事状態復元サービス
 * 
 * NFR要件:
 * - タブの復元（10個）: 5秒以内
 */
export class OptimizedRestoreService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(
    private readonly chromeWindowsAdapter: ChromeWindowsAdapter,
    // 将来の拡張用に保持
    _chromeTabsAdapter: ChromeTabsAdapter,
    private readonly calendarEventService: CalendarEventService,
    private readonly tabRestoreManager: OptimizedTabRestoreManager,
    // 将来の拡張用に保持
    _logger: Logger,
    private readonly performanceInterceptor: PerformanceInterceptor
  ) {
    // 将来の拡張用に保持
    void _chromeTabsAdapter;
    void _logger;
  }

  /**
   * 仕事状態を復元
   * パフォーマンス監視: 5秒以内（10タブ）
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @param onProgress 進捗コールバック（任意）
   * @returns 復元結果（ウィンドウID、タブIDの配列）
   */
  async restoreWorkState(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ windowId: number; tabIds: number[] }> {
    return this.performanceInterceptor.intercept(
      'restoreWorkState',
      async () => {
        // 1. WorkStateを取得
        const workState = await this.calendarEventService.findById(eventId, calendarId, accessToken);

        if (!workState) {
          throw new Error(`WorkState not found: ${eventId.value}`);
        }

        if (!workState.metadata || !workState.metadata.tabs || workState.metadata.tabs.length === 0) {
          throw new Error(`WorkState has no tabs: ${eventId.value}`);
        }

        // 2. 新しいウィンドウを最初のタブのURLで作成
        const firstTabUrl = workState.metadata.tabs[0].url;
        const window = await this.chromeWindowsAdapter.createWindow([firstTabUrl]);

        if (!window.id) {
          throw new Error('Window ID is undefined');
        }

        // 最初のタブのIDを取得
        const firstTabId = window.tabs?.[0]?.id;
        const tabIds: number[] = firstTabId ? [firstTabId] : [];

        // 3. 残りのタブを順番通りに復元（段階的読み込み + バッチ処理最適化）
        const remainingTabs = workState.metadata.tabs.slice(1);
        if (remainingTabs.length > 0) {
          const remainingTabIds = await this.tabRestoreManager.restoreTabsInOrder(
            remainingTabs,
            window.id,
            onProgress
          );
          tabIds.push(...remainingTabIds);
        }

        // 4. 復元メタデータを記録
        const restoredAt = new Date();
        const restoredToEventId = EventId.create(`restored-${window.id}-${restoredAt.getTime()}`);
        await this.calendarEventService.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken);

        return {
          windowId: window.id,
          tabIds,
        };
      }
    );
  }
}
