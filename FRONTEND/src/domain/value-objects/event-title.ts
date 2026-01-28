/**
 * EventTitle Value Object
 * イベントタイトル（仕事名）を表す不変オブジェクト
 */
export class EventTitle {
  private static readonly MAX_LENGTH = 200;

  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('EventTitle value cannot be empty');
    }
    if (_value.length > EventTitle.MAX_LENGTH) {
      throw new Error(`EventTitle value must be at most ${EventTitle.MAX_LENGTH} characters`);
    }
  }

  /**
   * EventTitleを作成
   * @param value タイトルの値
   * @returns EventTitleインスタンス
   */
  static create(value: string): EventTitle {
    return new EventTitle(value);
  }

  /**
   * タイトルの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のEventTitle
   * @returns 等しい場合true
   */
  equals(other: EventTitle): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
