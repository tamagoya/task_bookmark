/**
 * TabInfo Value Object
 * タブ情報を表す不変オブジェクト
 */
export class TabInfo {
  private constructor(
    public readonly url: string,
    public readonly title: string,
    public readonly faviconUrl: string | undefined,
    public readonly index: number,
    public readonly extensions: Record<string, unknown> | undefined
  ) {}

  /**
   * TabInfoを作成
   * @param data タブ情報のデータ
   * @returns TabInfoインスタンス
   * @throws バリデーションエラー
   */
  static create(data: {
    url: string;
    title: string;
    faviconUrl?: string;
    index: number;
    extensions?: Record<string, unknown>;
  }): TabInfo {
    // URLの検証
    if (!data.url || data.url.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }

    if (data.url.length > 2048) {
      throw new Error('URL exceeds maximum length of 2048 characters');
    }

    // URL形式の簡易チェック
    const isValidUrl =
      data.url.startsWith('http://') ||
      data.url.startsWith('https://') ||
      data.url.startsWith('chrome://') ||
      data.url.startsWith('chrome-extension://') ||
      data.url.startsWith('file://') ||
      data.url.startsWith('about:');

    if (!isValidUrl) {
      throw new Error('Invalid URL');
    }

    // タイトルの検証
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (data.title.length > 500) {
      throw new Error('Title exceeds maximum length of 500 characters');
    }

    // インデックスの検証
    if (!Number.isInteger(data.index) || data.index < 0) {
      throw new Error('Index must be a non-negative integer');
    }

    // ファビコンURLの正規化（空文字列や無効なURLの場合はundefined）
    let faviconUrl: string | undefined = data.faviconUrl;
    if (faviconUrl !== undefined) {
      if (faviconUrl.trim().length === 0) {
        faviconUrl = undefined;
      } else {
        // ファビコンURLの簡易チェック
        const isValidFaviconUrl =
          faviconUrl.startsWith('http://') ||
          faviconUrl.startsWith('https://') ||
          faviconUrl.startsWith('chrome://') ||
          faviconUrl.startsWith('chrome-extension://') ||
          faviconUrl.startsWith('data:');

        if (!isValidFaviconUrl) {
          faviconUrl = undefined;
        }
      }
    }

    return new TabInfo(
      data.url,
      data.title,
      faviconUrl,
      data.index,
      data.extensions
    );
  }

  /**
   * JSON形式にシリアライズ
   * @returns JSONオブジェクト
   */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      url: this.url,
      title: this.title,
      index: this.index,
    };
    if (this.faviconUrl !== undefined) {
      json.faviconUrl = this.faviconUrl;
    }
    if (this.extensions !== undefined) {
      json.extensions = this.extensions;
    }
    return json;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のTabInfo
   * @returns 等しい場合true
   */
  equals(other: TabInfo): boolean {
    if (!other) {
      return false;
    }

    if (
      this.url !== other.url ||
      this.title !== other.title ||
      this.index !== other.index
    ) {
      return false;
    }

    // faviconUrlの比較（undefinedも考慮）
    if (this.faviconUrl !== other.faviconUrl) {
      return false;
    }

    // extensionsの比較（undefinedも考慮）
    if (this.extensions !== other.extensions) {
      if (!this.extensions || !other.extensions) {
        return false;
      }
      // 簡易的な比較（深い比較は必要に応じて実装）
      return JSON.stringify(this.extensions) === JSON.stringify(other.extensions);
    }

    return true;
  }
}
