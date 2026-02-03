/**
 * ErrorSeverity Value Object
 * エラーの重要度を表す不変オブジェクト
 */
export class ErrorSeverity {
  static readonly INFO = 'INFO' as const;
  static readonly WARNING = 'WARNING' as const;
  static readonly ERROR = 'ERROR' as const;
  static readonly CRITICAL = 'CRITICAL' as const;

  private constructor() {
    // インスタンス化を防ぐ
  }

  /**
   * エラーが回復可能かどうかを判定
   * @param severity エラーの重要度
   * @returns 回復可能な場合true
   */
  static isRecoverable(severity: string): boolean {
    return severity === ErrorSeverity.INFO ||
           severity === ErrorSeverity.WARNING ||
           severity === ErrorSeverity.ERROR;
  }
}
