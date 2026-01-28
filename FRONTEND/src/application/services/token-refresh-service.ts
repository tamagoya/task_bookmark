import { AuthRepository } from '../../domain/repositories/auth-repository';
import { ChromeIdentityAdapter } from '../../infrastructure/adapters/chrome-identity-adapter';
import { AccessToken } from '../../domain/value-objects/access-token';
import { TokenExpiry } from '../../domain/value-objects/token-expiry';

/**
 * TokenRefreshService
 * トークンの自動更新を担当
 */
export class TokenRefreshService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly identityAdapter: ChromeIdentityAdapter
  ) {}

  /**
   * トークンが期限切れの場合、自動更新
   * @returns 更新された場合true
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    const authState = await this.authRepository.getCurrent();
    if (!authState || !authState.isAuthenticated) {
      return false;
    }

    if (!authState.isTokenExpired()) {
      return false;
    }

    try {
      // 新しいトークンを取得
      const newToken = await this.identityAdapter.getAuthToken();
      const newAccessToken = AccessToken.create(newToken);
      const newExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));

      // トークンを更新
      authState.refreshAccessToken(newAccessToken, newExpiry);
      await this.authRepository.save(authState);

      return true;
    } catch (error) {
      // トークン更新エラーはログに記録
      console.error('Failed to refresh token:', error);
      return false;
    }
  }
}
