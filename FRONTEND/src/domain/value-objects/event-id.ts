/**
 * EventId Value Object
 * カレンダーイベントIDを表す不変オブジェクト
 */
export class EventId {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('EventId value cannot be empty');
    }
  }

  /**
   * EventIdを作成
   * @param value イベントIDの値
   * @returns EventIdインスタンス
   */
  static create(value: string): EventId {
    return new EventId(value);
  }

  /**
   * イベントIDの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のEventId
   * @returns 等しい場合true
   */
  equals(other: EventId): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
