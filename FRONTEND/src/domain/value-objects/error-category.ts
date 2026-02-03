/**
 * ErrorCategory Value Object
 * エラーのカテゴリを表す不変オブジェクト
 */
export class ErrorCategory {
  static readonly AUTHENTICATION = 'AUTHENTICATION' as const;
  static readonly NETWORK = 'NETWORK' as const;
  static readonly API = 'API' as const;
  static readonly VALIDATION = 'VALIDATION' as const;
  static readonly DATA = 'DATA' as const;
  static readonly SYSTEM = 'SYSTEM' as const;

  private constructor() {
    // インスタンス化を防ぐ
  }
}
