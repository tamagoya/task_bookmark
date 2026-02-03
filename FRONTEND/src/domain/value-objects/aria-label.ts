/**
 * AriaLabel Value Object
 * ARIAラベルを表す不変オブジェクト
 */
export class AriaLabel {
  private constructor(
    private readonly _label: string,
    private readonly _description?: string
  ) {
    if (!_label || _label.trim().length === 0) {
      throw new Error('AriaLabel label cannot be empty');
    }
  }

  /**
   * AriaLabelを作成
   * @param label ARIAラベル（日本語）
   * @param description 追加の説明（オプション）
   * @returns AriaLabelインスタンス
   */
  static create(label: string, description?: string): AriaLabel {
    return new AriaLabel(label, description);
  }

  /**
   * ARIAラベルを取得
   */
  get label(): string {
    return this._label;
  }

  /**
   * 追加の説明を取得
   */
  get description(): string | undefined {
    return this._description;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のAriaLabel
   * @returns 等しい場合true
   */
  equals(other: AriaLabel): boolean {
    if (!other) {
      return false;
    }
    return this._label === other._label;
  }
}
