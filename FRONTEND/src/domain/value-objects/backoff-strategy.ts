/**
 * BackoffStrategy Value Object
 * バックオフ戦略を表す不変オブジェクト
 */
export class BackoffStrategy {
  static readonly LINEAR = 'LINEAR' as const;
  static readonly EXPONENTIAL = 'EXPONENTIAL' as const;
  static readonly FIXED = 'FIXED' as const;

  private constructor() {
    // インスタンス化を防ぐ
  }
}
