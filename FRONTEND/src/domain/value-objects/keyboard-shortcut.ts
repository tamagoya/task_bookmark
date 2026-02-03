/**
 * KeyboardShortcut Value Object
 * キーボードショートカットを表す不変オブジェクト
 */
export class KeyboardShortcut {
  private constructor(
    private readonly _key: string,
    private readonly _action: string,
    private readonly _description?: string
  ) {
    if (!_key || _key.trim().length === 0) {
      throw new Error('KeyboardShortcut key cannot be empty');
    }
    if (!_action || _action.trim().length === 0) {
      throw new Error('KeyboardShortcut action cannot be empty');
    }
  }

  /**
   * KeyboardShortcutを作成
   * @param key キー（例: "Enter", "Escape", "Ctrl+S"）
   * @param action アクション名（例: "保存", "キャンセル"）
   * @param description 説明（オプション）
   * @returns KeyboardShortcutインスタンス
   */
  static create(key: string, action: string, description?: string): KeyboardShortcut {
    return new KeyboardShortcut(key, action, description);
  }

  /**
   * キーを取得
   */
  get key(): string {
    return this._key;
  }

  /**
   * アクション名を取得
   */
  get action(): string {
    return this._action;
  }

  /**
   * 説明を取得
   */
  get description(): string | undefined {
    return this._description;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のKeyboardShortcut
   * @returns 等しい場合true
   */
  equals(other: KeyboardShortcut): boolean {
    if (!other) {
      return false;
    }
    return this._key === other._key && this._action === other._action;
  }
}
