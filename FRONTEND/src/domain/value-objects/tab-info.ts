/**
 * TabInfo Value Object (Unit 2から参照)
 * タブ情報を表すValue Objectのインターフェース定義
 * 
 * 注意: Unit 2で実装される予定のため、現時点ではインターフェース定義のみ
 */
export interface TabInfo {
  url: string;
  title: string;
  faviconUrl?: string;
  index: number;
  extensions?: Record<string, unknown>;
}
