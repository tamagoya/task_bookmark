/**
 * IgnoreFlags Value Object
 * 無視URLルールの3つの独立した動作フラグを表す不変オブジェクト
 *
 * - ignoreOnSave:    保存対象から除外（WorkState の tabs[] に含めない）
 * - ignoreOnClose:   保存後に閉じない（保存対象に含まれていても、いなくても独立に作用）
 * - ignoreOnRestore: 復元時に開かない（WorkState のデータは保持）
 *
 * 少なくとも1つが true でなければならない（ADR-032）。
 */
export class IgnoreFlags {
  private constructor(
    public readonly ignoreOnSave: boolean,
    public readonly ignoreOnClose: boolean,
    public readonly ignoreOnRestore: boolean
  ) {}

  /**
   * IgnoreFlagsを作成
   * @throws 全フラグ false の場合エラー
   */
  static create(data: {
    ignoreOnSave: boolean;
    ignoreOnClose: boolean;
    ignoreOnRestore: boolean;
  }): IgnoreFlags {
    if (
      typeof data.ignoreOnSave !== 'boolean' ||
      typeof data.ignoreOnClose !== 'boolean' ||
      typeof data.ignoreOnRestore !== 'boolean'
    ) {
      throw new Error('IgnoreFlags fields must all be boolean');
    }

    if (!data.ignoreOnSave && !data.ignoreOnClose && !data.ignoreOnRestore) {
      throw new Error(
        'IgnoreFlags must have at least one flag set to true'
      );
    }

    return new IgnoreFlags(
      data.ignoreOnSave,
      data.ignoreOnClose,
      data.ignoreOnRestore
    );
  }

  /**
   * いずれかのフラグが true か
   */
  hasAnyFlag(): boolean {
    return this.ignoreOnSave || this.ignoreOnClose || this.ignoreOnRestore;
  }

  /**
   * 等価性チェック
   */
  equals(other: IgnoreFlags | undefined | null): boolean {
    if (!other) {
      return false;
    }
    return (
      this.ignoreOnSave === other.ignoreOnSave &&
      this.ignoreOnClose === other.ignoreOnClose &&
      this.ignoreOnRestore === other.ignoreOnRestore
    );
  }
}
