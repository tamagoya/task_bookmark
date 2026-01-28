import { TokenRefreshService } from '../../../src/application/services/token-refresh-service';
import { AuthRepository } from '../../../src/domain/repositories/auth-repository';
import { ChromeIdentityAdapter } from '../../../src/infrastructure/adapters/chrome-identity-adapter';
import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';

// モック
jest.mock('../../../src/infrastructure/adapters/chrome-identity-adapter');

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let authRepository: jest.Mocked<AuthRepository>;
  let identityAdapter: jest.Mocked<ChromeIdentityAdapter>;

  beforeEach(() => {
    authRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getCurrent: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    identityAdapter = new ChromeIdentityAdapter() as jest.Mocked<ChromeIdentityAdapter>;
    service = new TokenRefreshService(authRepository, identityAdapter);
  });

  describe('refreshTokenIfNeeded', () => {
    it('トークンが期限切れの場合、トークンを更新する', async () => {
      // TokenExpiryは未来の日時を要求するため、実際に時間を進める方法を使う
      jest.useFakeTimers();
      const userId = 'user-123';
      const expiredToken = AccessToken.create('expired-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      // 非常に短い有効期限（1秒）のトークンを作成
      const expiredExpiry = TokenExpiry.create(new Date(Date.now() + 1000));
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(expiredToken, refreshToken, expiredExpiry);
      
      // 時間を進めて期限切れにする（2秒進める）
      jest.advanceTimersByTime(2000);

      const newToken = 'new-access-token-67890';

      authRepository.getCurrent.mockResolvedValue(authState);
      identityAdapter.getAuthToken.mockResolvedValue(newToken);
      authRepository.save.mockResolvedValue();

      const result = await service.refreshTokenIfNeeded();

      expect(result).toBe(true);
      expect(identityAdapter.getAuthToken).toHaveBeenCalled();
      expect(authRepository.save).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('トークンが有効な場合は、更新しない', async () => {
      const userId = 'user-123';
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000)); // 未来の日時
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);

      authRepository.getCurrent.mockResolvedValue(authState);

      const result = await service.refreshTokenIfNeeded();

      expect(result).toBe(false);
      expect(identityAdapter.getAuthToken).not.toHaveBeenCalled();
      expect(authRepository.save).not.toHaveBeenCalled();
    });

    it('未認証の場合は、更新しない', async () => {
      authRepository.getCurrent.mockResolvedValue(null);

      const result = await service.refreshTokenIfNeeded();

      expect(result).toBe(false);
      expect(identityAdapter.getAuthToken).not.toHaveBeenCalled();
    });

    it('トークン更新に失敗した場合は、falseを返す', async () => {
      // TokenExpiryは未来の日時を要求するため、実際に時間を進める方法を使う
      jest.useFakeTimers();
      const userId = 'user-123';
      const expiredToken = AccessToken.create('expired-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      // 非常に短い有効期限（1秒）のトークンを作成
      const expiredExpiry = TokenExpiry.create(new Date(Date.now() + 1000));
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(expiredToken, refreshToken, expiredExpiry);
      
      // 時間を進めて期限切れにする（2秒進める）
      jest.advanceTimersByTime(2000);

      authRepository.getCurrent.mockResolvedValue(authState);
      identityAdapter.getAuthToken.mockRejectedValue(new Error('Token refresh failed'));

      const result = await service.refreshTokenIfNeeded();

      expect(result).toBe(false);
      expect(identityAdapter.getAuthToken).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});
