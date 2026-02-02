/**
 * RestoreRelation Value Object
 * 復元関係を表す不変オブジェクト
 */
export interface RestoreRelationData {
  eventId: string;
  title: string;
  savedAt: string;
  restoredAt?: string;
}

/**
 * RestoreRelation Value Object
 * 復元関係を表す不変オブジェクト
 */
export class RestoreRelation {
  private constructor(
    private readonly _eventId: string,
    private readonly _title: string,
    private readonly _savedAt: string,
    private readonly _restoredAt?: string
  ) {
    // バリデーション
    if (!_eventId || _eventId.trim().length === 0) {
      throw new Error('RestoreRelation eventId cannot be empty');
    }
    if (!_title || _title.trim().length === 0) {
      throw new Error('RestoreRelation title cannot be empty');
    }
    if (!_savedAt || _savedAt.trim().length === 0) {
      throw new Error('RestoreRelation savedAt cannot be empty');
    }
    // ISO 8601形式の簡易チェック
    if (isNaN(Date.parse(_savedAt))) {
      throw new Error('RestoreRelation savedAt must be a valid ISO 8601 date string');
    }
    if (_restoredAt !== undefined) {
      if (_restoredAt.trim().length === 0) {
        throw new Error('RestoreRelation restoredAt cannot be empty if provided');
      }
      if (isNaN(Date.parse(_restoredAt))) {
        throw new Error('RestoreRelation restoredAt must be a valid ISO 8601 date string');
      }
    }
  }

  /**
   * RestoreRelationを作成
   * @param data 復元関係データ
   * @returns RestoreRelationインスタンス
   */
  static create(data: RestoreRelationData): RestoreRelation {
    return new RestoreRelation(
      data.eventId,
      data.title,
      data.savedAt,
      data.restoredAt
    );
  }

  /**
   * イベントIDを取得
   */
  get eventId(): string {
    return this._eventId;
  }

  /**
   * タイトルを取得
   */
  get title(): string {
    return this._title;
  }

  /**
   * 保存日時を取得
   */
  get savedAt(): string {
    return this._savedAt;
  }

  /**
   * 復元日時を取得
   */
  get restoredAt(): string | undefined {
    return this._restoredAt;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のRestoreRelation
   * @returns 等しい場合true
   */
  equals(other: RestoreRelation): boolean {
    if (!other) {
      return false;
    }
    return (
      this._eventId === other._eventId &&
      this._title === other._title &&
      this._savedAt === other._savedAt &&
      this._restoredAt === other._restoredAt
    );
  }
}
