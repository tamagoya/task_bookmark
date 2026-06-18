import { TabInfo } from '../../domain/value-objects/tab-info';

/**
 * Chrome Tabs API から取得したタブの表示・保存用エントリ
 */
export interface CapturedTabEntry {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  faviconUrl?: string;
  index: number;
  tabInfo: TabInfo | null;
}

/**
 * 選択されたタブIDでエントリをフィルタする
 * @param entries 全タブエントリ
 * @param selectedTabIds 選択されたタブID（未指定時は全件）
 */
export function filterEntriesBySelectedTabIds(
  entries: CapturedTabEntry[],
  selectedTabIds?: number[]
): CapturedTabEntry[] {
  if (selectedTabIds === undefined) {
    return entries;
  }
  const selected = new Set(selectedTabIds);
  return entries.filter((entry) => selected.has(entry.tabId));
}

/**
 * CapturedTabEntry から TabInfo 配列と tabIdUrlPairs を抽出
 */
export function extractTabsFromEntries(entries: CapturedTabEntry[]): {
  tabs: TabInfo[];
  tabIdUrlPairs: Array<{ tabId: number; url: string }>;
} {
  const tabs: TabInfo[] = [];
  const tabIdUrlPairs: Array<{ tabId: number; url: string }> = [];

  for (const entry of entries) {
    tabIdUrlPairs.push({ tabId: entry.tabId, url: entry.url });
    if (entry.tabInfo !== null) {
      tabs.push(entry.tabInfo);
    }
  }

  return { tabs, tabIdUrlPairs };
}
