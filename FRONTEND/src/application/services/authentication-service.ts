import { ChromeIdentityAdapter } from '../../infrastructure/adapters/chrome-identity-adapter';
import { AuthRepository } from '../../domain/repositories/auth-repository';
import { AuthState } from '../../domain/entities/auth-state';
import { AuthStateFactory } from '../../domain/factories/auth-state-factory';
import { AccessToken } from '../../domain/value-objects/access-token';
import { RefreshToken } from '../../domain/value-objects/refresh-token';
import { TokenExpiry } from '../../domain/value-objects/token-expiry';

/**
 * AuthenticationService
 * 認証フローの実行を担当
 */
export class AuthenticationService {
  constructor(
    private readonly identityAdapter: ChromeIdentityAdapter,
    private readonly authRepository: AuthRepository
  ) {}

  /**
   * 認証を実行
   * @returns 認証状態
   * @throws 認証エラー
   */
  async authenticate(): Promise<AuthState> {
    try {
      // Chrome Identity APIからトークンを取得
      const token = await this.identityAdapter.getAuthToken();

      // トークンからユーザー情報を取得（簡易実装）
      // 実際の実装では、トークンからユーザーIDを抽出する必要がある
      const userId = await this._getUserIdFromToken(token);

      // 既存の認証状態を取得
      let authState = await this.authRepository.getCurrent();
      if (!authState || authState.userId !== userId) {
        authState = AuthStateFactory.createUnauthenticated(userId);
      }

      // トークンの有効期限を計算（簡易実装: 1時間後）
      const expiresAt = new Date(Date.now() + 3600000);
      const accessToken = AccessToken.create(token);
      const refreshToken = RefreshToken.create(token); // 実際には別のトークンが必要
      const tokenExpiry = TokenExpiry.create(expiresAt);

      // 認証状態を設定
      authState.authenticate(accessToken, refreshToken, tokenExpiry);

      // 認証状態を保存
      await this.authRepository.save(authState);

      return authState;
    } catch (error) {
      // イベントハンドラーに通知（実装は後で追加）
      throw error;
    }
  }

  /**
   * 認証状態を確認
   * @returns 認証済みの場合true
   */
  async isAuthenticated(): Promise<boolean> {
    const authState = await this.authRepository.getCurrent();
    return authState?.isAuthenticated ?? false;
  }

  /**
   * ログアウトを実行
   */
  async logout(): Promise<void> {
    const authState = await this.authRepository.getCurrent();
    if (authState) {
      // キャッシュされたトークンを削除
      if (authState.accessToken) {
        try {
          await this.identityAdapter.removeCachedAuthToken(authState.accessToken.value);
        } catch (error) {
          // トークン削除エラーは無視
          console.error('Failed to remove cached token:', error);
        }
      }

      // 認証状態をクリア
      authState.logout();
      await this.authRepository.save(authState);
    }
  }

  /**
   * トークンからユーザーIDを取得（簡易実装）
   * 実際の実装では、Google APIからユーザー情報を取得する必要がある
   * @param token アクセストークン
   * @returns ユーザーID
   */
  private async _getUserIdFromToken(token: string): Promise<string> {
    // 簡易実装: 実際にはGoogle APIからユーザー情報を取得
    // ここでは、トークンのハッシュを使用（実際の実装では変更が必要）
    return `user-${token.substring(0, 8)}`;
  }
}
