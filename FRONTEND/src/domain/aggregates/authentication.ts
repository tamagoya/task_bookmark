import { AuthState } from '../entities/auth-state';

/**
 * Authentication Aggregate Root
 * 認証ドメインの集約ルート
 * 
 * 注意: 現在の実装では、AuthStateがAggregate Rootとして機能しています。
 * 将来的に複数の認証状態を管理する必要がある場合、このクラスを拡張します。
 */
export class Authentication {
  private constructor(private readonly _authState: AuthState) {}

  /**
   * Authentication Aggregateを作成
   * @param authState 認証状態
   * @returns Authenticationインスタンス
   */
  static create(authState: AuthState): Authentication {
    return new Authentication(authState);
  }

  /**
   * 認証状態を取得
   */
  get authState(): AuthState {
    return this._authState;
  }

  /**
   * 認証状態を更新
   * @param authState 新しい認証状態
   * @returns 新しいAuthenticationインスタンス（イミュータブル）
   */
  updateAuthState(authState: AuthState): Authentication {
    return new Authentication(authState);
  }
}
