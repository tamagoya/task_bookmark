import { TabInfo } from '../value-objects/tab-info';

/**
 * TabInfoFactory
 * TabInfoの作成を担当するFactory
 */
export class TabInfoFactory {
  /**
   * Chrome Tabs APIのTabオブジェクトからTabInfoを作成
   * @param chromeTab Chrome Tabs APIのタブオブジェクト
   * @returns TabInfoインスタンス
   * @throws バリデーションエラー
   */
  static createFromChromeTab(chromeTab: chrome.tabs.Tab): TabInfo {
    // URLの検証
    if (!chromeTab.url) {
      throw new Error('Invalid URL');
    }

    // タイトルの検証
    if (!chromeTab.title || chromeTab.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    // インデックスの検証
    if (chromeTab.index === undefined || chromeTab.index < 0) {
      throw new Error('Invalid tab index');
    }

    return TabInfo.create({
      url: chromeTab.url,
      title: chromeTab.title,
      faviconUrl: chromeTab.favIconUrl,
      index: chromeTab.index,
    });
  }

  /**
   * 生のデータからTabInfoを作成
   * @param data タブ情報の生データ
   * @returns TabInfoインスタンス
   * @throws バリデーションエラー
   */
  static createFromRawData(data: {
    url: string;
    title: string;
    faviconUrl?: string;
    index: number;
    extensions?: Record<string, unknown>;
  }): TabInfo {
    return TabInfo.create(data);
  }
}
