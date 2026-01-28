import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { CalendarEventService } from './calendar-event-service';
import { TabRestoreManager } from './tab-restore-manager';
import { Logger } from '../../infrastructure/adapters/logger';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';

/**
 * RestoreService
 * 仕事状態の復元処理を担当するアプリケーションサービス
 */
export class RestoreService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(
    private readonly chromeWindowsAdapter: ChromeWindowsAdapter,
    // 将来の拡張用に保持（タブ作成時のエラーハンドリングなど）
    chromeTabsAdapter: ChromeTabsAdapter,
    private readonly calendarEventService: CalendarEventService,
    private readonly tabRestoreManager: TabRestoreManager,
    // 将来の拡張用に保持（詳細なログ出力など）
    logger: Logger
  ) {
    // 将来の拡張用に保持
    void chromeTabsAdapter;
    void logger;
  }

  /**
   * 仕事状態を復元
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
    // 1. WorkStateを取得
    const workState = await this.calendarEventService.findById(eventId, calendarId, accessToken);

    if (!workState) {
      throw new Error(`WorkState not found: ${eventId.value}`);
    }

    if (!workState.metadata || !workState.metadata.tabs || workState.metadata.tabs.length === 0) {
      throw new Error(`WorkState has no tabs: ${eventId.value}`);
    }

    // 2. 新しいウィンドウを最初のタブのURLで作成（デフォルトの「新しいタブ」を避ける）
    const firstTabUrl = workState.metadata.tabs[0].url;
    const window = await this.chromeWindowsAdapter.createWindow([firstTabUrl]);

    if (!window.id) {
      throw new Error('Window ID is undefined');
    }

    // 最初のタブのIDを取得
    const firstTabId = window.tabs?.[0]?.id;
    const tabIds: number[] = firstTabId ? [firstTabId] : [];

    // 3. 残りのタブを順番通りに復元（段階的読み込み）
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
    // 復元先のイベントIDを生成（ウィンドウIDとタイムスタンプを使用）
    // 注: 現在の実装では復元時に新しいカレンダーイベントを作成しないため、一時的なIDを生成
    // Bolt 7以降で、復元時に新しいイベントを作成する機能を追加する予定
    const restoredAt = new Date();
    const restoredToEventId = EventId.create(`restored-${window.id}-${restoredAt.getTime()}`);
    await this.calendarEventService.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken);

    return {
      windowId: window.id,
      tabIds,
    };
  }
}
