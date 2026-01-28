import { TabInfo } from '../value-objects/tab-info';

/**
 * TabsCaptured Domain Event
 * タブ情報が取得された時に発行されるイベント
 */
export class TabsCaptured {
  constructor(
    public readonly tabs: TabInfo[],
    public readonly windowId: number,
    public readonly capturedAt: Date
  ) {
    // ビジネスルール: tabs配列は空であってはならない
    if (!tabs || tabs.length === 0) {
      throw new Error('Tabs array cannot be empty');
    }

    // ビジネスルール: windowIdは有効なウィンドウIDである必要がある
    if (!Number.isInteger(windowId) || windowId < 0) {
      throw new Error('Window ID must be a non-negative integer');
    }

    // ビジネスルール: capturedAtは現在時刻または過去の時刻である必要がある
    const now = new Date();
    if (capturedAt.getTime() > now.getTime()) {
      throw new Error('CapturedAt cannot be in the future');
    }
  }

  /**
   * 取得されたタブの数
   */
  get tabCount(): number {
    return this.tabs.length;
  }
}
