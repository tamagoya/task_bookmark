/**
 * CalendarId Value Object
 * カレンダーIDを表す不変オブジェクト
 */
export class CalendarId {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('CalendarId value cannot be empty');
    }
  }

  /**
   * CalendarIdを作成
   * @param value カレンダーIDの値
   * @returns CalendarIdインスタンス
   */
  static create(value: string): CalendarId {
    return new CalendarId(value);
  }

  /**
   * カレンダーIDの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のCalendarId
   * @returns 等しい場合true
   */
  equals(other: CalendarId): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
