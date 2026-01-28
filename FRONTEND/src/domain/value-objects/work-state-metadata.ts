import { SchemaVersion } from './schema-version';
import { TabInfo } from './tab-info';

/**
 * WorkStateMetadata Value Object
 * 仕事状態のメタデータを表す不変オブジェクト
 * スキーマバージョニングと拡張性をサポート
 */
export class WorkStateMetadata {
  private constructor(
    private readonly _version: SchemaVersion,
    private readonly _tabs: TabInfo[],
    private readonly _savedAt: string,
    private readonly _memo?: string,
    private readonly _restoredFrom?: string,
    private readonly _restoredTo?: string[],
    private readonly _extensions?: Record<string, unknown>
  ) {
    // バリデーション: 正常な状態ではtabsは少なくとも1つのタブを含む必要がある
    // ただし、破損時は空配列も許容するため、ここではチェックしない
    if (!_savedAt || _savedAt.trim().length === 0) {
      throw new Error('WorkStateMetadata savedAt cannot be empty');
    }
    // ISO 8601形式の簡易チェック
    if (isNaN(Date.parse(_savedAt))) {
      throw new Error('WorkStateMetadata savedAt must be a valid ISO 8601 date string');
    }
  }

  /**
   * WorkStateMetadataを作成
   * @param version スキーマバージョン
   * @param tabs タブ情報の配列
   * @param savedAt 保存日時
   * @param memo 作業メモ（任意）
   * @param extensions 拡張フィールド（任意）
   * @returns WorkStateMetadataインスタンス
   */
  static create(
    version: SchemaVersion,
    tabs: TabInfo[],
    savedAt: Date,
    memo?: string,
    extensions?: Record<string, unknown>
  ): WorkStateMetadata {
    if (!tabs || tabs.length === 0) {
      throw new Error('WorkStateMetadata tabs must contain at least one tab');
    }
    return new WorkStateMetadata(
      version,
      tabs,
      savedAt.toISOString(),
      memo,
      undefined,
      undefined,
      extensions
    );
  }

  /**
   * 生データからWorkStateMetadataを作成（読み込み時、マイグレーション時）
   * @param raw 生データ
   * @param version スキーマバージョン
   * @returns WorkStateMetadataインスタンス
   */
  static createFromRaw(raw: Record<string, unknown>, version: SchemaVersion): WorkStateMetadata {
    // 必須フィールドの検証
    if (!raw.tabs || !Array.isArray(raw.tabs)) {
      throw new Error('WorkStateMetadata tabs must be an array');
    }
    if (!raw.savedAt || typeof raw.savedAt !== 'string') {
      throw new Error('WorkStateMetadata savedAt must be a string');
    }

    // raw.tabsをTabInfoインスタンスに変換
    // JSONから読み込んだデータはプレーンオブジェクトなので、TabInfo.create()で変換
    const tabs: TabInfo[] = [];
    for (const tabData of raw.tabs as unknown[]) {
      if (tabData instanceof TabInfo) {
        // 既にTabInfoインスタンスの場合はそのまま使用
        tabs.push(tabData);
      } else if (typeof tabData === 'object' && tabData !== null) {
        // プレーンオブジェクトの場合はTabInfo.create()で変換
        const tabObj = tabData as Record<string, unknown>;
        tabs.push(
          TabInfo.create({
            url: tabObj.url as string,
            title: tabObj.title as string,
            faviconUrl: tabObj.faviconUrl as string | undefined,
            index: tabObj.index as number,
            extensions: tabObj.extensions as Record<string, unknown> | undefined,
          })
        );
      }
    }

    const savedAt = raw.savedAt as string;
    const memo = raw.memo as string | undefined;
    const restoredFrom = raw.restoredFrom as string | undefined;
    const restoredTo = raw.restoredTo as string[] | undefined;

    // 未知のフィールドをextensionsに格納（前方互換性のため）
    const knownFields = ['version', 'tabs', 'memo', 'savedAt', 'restoredFrom', 'restoredTo', 'extensions'];
    const extensions: Record<string, unknown> = { ...(raw.extensions as Record<string, unknown> | undefined) };
    for (const [key, value] of Object.entries(raw)) {
      if (!knownFields.includes(key)) {
        extensions[key] = value;
      }
    }

    return new WorkStateMetadata(
      version,
      tabs,
      savedAt,
      memo,
      restoredFrom,
      restoredTo,
      Object.keys(extensions).length > 0 ? extensions : undefined
    );
  }

  /**
   * スキーマバージョンを取得
   */
  get version(): SchemaVersion {
    return this._version;
  }

  /**
   * タブ情報の配列を取得
   */
  get tabs(): TabInfo[] {
    return [...this._tabs]; // イミュータビリティのためコピーを返す
  }

  /**
   * 保存日時を取得
   */
  get savedAt(): string {
    return this._savedAt;
  }

  /**
   * 作業メモを取得
   */
  get memo(): string | undefined {
    return this._memo;
  }

  /**
   * 復元元のイベントIDを取得
   */
  get restoredFrom(): string | undefined {
    return this._restoredFrom;
  }

  /**
   * 復元先のイベントIDリストを取得
   */
  get restoredTo(): string[] | undefined {
    return this._restoredTo ? [...this._restoredTo] : undefined; // イミュータビリティのためコピーを返す
  }

  /**
   * 拡張フィールドを取得
   */
  get extensions(): Record<string, unknown> | undefined {
    return this._extensions ? { ...this._extensions } : undefined; // イミュータビリティのためコピーを返す
  }

  /**
   * JSON形式にシリアライズ
   * @returns JSONオブジェクト
   */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      version: this._version.toString(),
      tabs: this._tabs,
      savedAt: this._savedAt,
    };

    if (this._memo !== undefined) {
      json.memo = this._memo;
    }
    if (this._restoredFrom !== undefined) {
      json.restoredFrom = this._restoredFrom;
    }
    if (this._restoredTo !== undefined) {
      json.restoredTo = this._restoredTo;
    }
    if (this._extensions !== undefined) {
      json.extensions = this._extensions;
    }

    return json;
  }

  /**
   * 等価性チェック（extensionsは除外）
   * @param other 比較対象のWorkStateMetadata
   * @returns 等しい場合true
   */
  equals(other: WorkStateMetadata): boolean {
    if (!other) {
      return false;
    }
    return (
      this._version.equals(other._version) &&
      this._tabs.length === other._tabs.length &&
      this._tabs.every((tab, index) => {
        const otherTab = other._tabs[index];
        return (
          tab.url === otherTab.url &&
          tab.title === otherTab.title &&
          tab.faviconUrl === otherTab.faviconUrl &&
          tab.index === otherTab.index
        );
      }) &&
      this._savedAt === other._savedAt &&
      this._memo === other._memo &&
      this._restoredFrom === other._restoredFrom &&
      JSON.stringify(this._restoredTo) === JSON.stringify(other._restoredTo)
    );
  }
}
