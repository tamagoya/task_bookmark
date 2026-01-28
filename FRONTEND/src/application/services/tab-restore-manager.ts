import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { Logger } from '../../infrastructure/adapters/logger';
import { TabInfo } from '../../domain/value-objects/tab-info';

/**
 * TabRestoreManager
 * タブの復元処理と順序管理を担当するマネージャー
 */
export class TabRestoreManager {
  private static readonly BATCH_SIZE = 5;
  private static readonly BATCH_DELAY_MS = 100;

  constructor(
    private readonly chromeTabsAdapter: ChromeTabsAdapter,
    private readonly logger: Logger
  ) {}

  /**
   * タブを順番通りに復元
   * @param tabs タブ情報の配列
   * @param windowId ウィンドウID
   * @param onProgress 進捗コールバック（任意）
   * @returns 作成されたタブIDの配列
   */
  async restoreTabsInOrder(
    tabs: TabInfo[],
    windowId: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number[]> {
    if (tabs.length === 0) {
      return [];
    }

    const tabIds: number[] = [];
    const totalTabs = tabs.length;
    const useBatching = totalTabs >= 20;

    if (useBatching) {
      // 段階的な読み込み（20個以上の場合）
      for (let i = 0; i < tabs.length; i += TabRestoreManager.BATCH_SIZE) {
        const batch = tabs.slice(i, i + TabRestoreManager.BATCH_SIZE);
        
        for (const tab of batch) {
          try {
            const chromeTab = await this.chromeTabsAdapter.createTab(windowId, tab.url, tab.index);
            if (chromeTab.id) {
              tabIds.push(chromeTab.id);
            }
          } catch (error) {
            // エラーが発生したタブはスキップして続行
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to restore tab ${tab.url}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
          }

          // 進捗を通知
          if (onProgress) {
            onProgress(tabIds.length, totalTabs);
          }
        }

        // 最後のバッチでない場合は待機
        if (i + TabRestoreManager.BATCH_SIZE < tabs.length) {
          await new Promise(resolve => setTimeout(resolve, TabRestoreManager.BATCH_DELAY_MS));
        }
      }
    } else {
      // 通常の読み込み（20個未満の場合）
      for (const tab of tabs) {
        try {
          const chromeTab = await this.chromeTabsAdapter.createTab(windowId, tab.url, tab.index);
          if (chromeTab.id) {
            tabIds.push(chromeTab.id);
          }
        } catch (error) {
          // エラーが発生したタブはスキップして続行
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to restore tab ${tab.url}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
        }

        // 進捗を通知
        if (onProgress) {
          onProgress(tabIds.length, totalTabs);
        }
      }
    }

    return tabIds;
  }
}
